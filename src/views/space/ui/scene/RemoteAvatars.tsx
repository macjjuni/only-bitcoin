"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, Suspense, useEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import {
  type RemotePlayer,
  resolveAvatarColor,
  resolveAvatarModel,
  SPACE_AVATAR,
  SPACE_MAX_OCCUPANTS,
  type SpaceAvatarModel,
  type SpaceTerrain,
} from "@/entities/space";
import { groupPlayersByModel, selectSpaceAvatarSlots } from "@/views/space/lib/avatarCapacity";
import { CREW_WALK, useCrewModel } from "@/views/space/lib/crewModel";
import {
  applyCrewSkinning,
  createCrewInstanceGeometry,
  useSkinnedCrewMaterial,
} from "@/views/space/lib/crewSkinning";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

const SHADOW_LIFT_Y = 0.02;
/** 이보다 느리면 멈춘 것으로 보고 레스트 포즈로 돌린다. */
const MOVING_SPEED_THRESHOLD = 0.25;
/**
 * 지면에 서 있다고 보는 높이 차.
 *
 * 로컬 아바타처럼 정확히 같을 수는 없다. 원격 좌표는 1 cm 로 양자화돼 오고
 * 두 스냅샷 사이를 보간하므로, 계단(한 칸 25 cm)을 오르는 중에는 보간된 `y` 가
 * 실제 디딤면과 최대 12 cm 쯤 벌어진다. 점프 정점(1.13 m)보다는 한참 낮아
 * 공중을 접지로 오판하지 않는다.
 */
const GROUNDED_TOLERANCE_Y = 0.2;

interface RemoteAvatarGroupProps {
  /** 이 그룹이 쓰는 모델. 그룹 하나가 `InstancedMesh` 4개를 쓴다. */
  model: SpaceAvatarModel;
  players: readonly RemotePlayer[];
  /** 접지 판정용. 원격 아바타는 적분기가 없어 지형에 직접 묻는다. */
  terrainRef: RefObject<SpaceTerrain>;
}

/**
 * 같은 모델을 고른 원격 아바타를 인스턴싱으로 그린다.
 *
 * 개별 `<mesh>` 로 만들면 50명이면 부위마다 50 콜씩 쌓여 모바일 예산(50)을 몇 배
 * 넘긴다. `InstancedMesh` 4개로 고정해 그룹 전원을 드로우 콜 4개에 담는다. 걷기는
 * 구워 둔 본 행렬을 셰이더가 읽어 처리한다. 근거는 `docs/btc-space-3d.md` §8 에 있다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function RemoteAvatarGroup({ model, players, terrainRef }: RemoteAvatarGroupProps): ReactNode {
  // region [Hooks]
  const bodyMeshRef = useRef<InstancedMesh>(null);
  const accentMeshRef = useRef<InstancedMesh>(null);
  const pupilGlintMeshRef = useRef<InstancedMesh>(null);
  const shadowMeshRef = useRef<InstancedMesh>(null);
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const crew = useCrewModel(model);
  const bodyMaterial = useSkinnedCrewMaterial(crew.bodyMaterial, crew.walkTexture);
  const pupilGlintMaterial = useSkinnedCrewMaterial(crew.pupilGlintMaterial, crew.walkTexture);

  /** 공유 지오메트리에 인스턴스 버퍼를 직접 달면 로컬 플레이어와 서로 덮어쓴다. */
  const body = useMemo(
    () => createCrewInstanceGeometry(crew.bodyGeometry, SPACE_MAX_OCCUPANTS),
    [crew.bodyGeometry],
  );
  const accent = useMemo(
    () => createCrewInstanceGeometry(crew.accentGeometry, SPACE_MAX_OCCUPANTS),
    [crew.accentGeometry],
  );
  /** 글린트가 없는 모델(곰)에서는 `null` 이다. 메시도 그리지 않는다. */
  const pupilGlint = useMemo(
    () =>
      crew.pupilGlintGeometry
        ? createCrewInstanceGeometry(crew.pupilGlintGeometry, SPACE_MAX_OCCUPANTS)
        : null,
    [crew.pupilGlintGeometry],
  );
  const accentMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({ roughness: 0.84, metalness: 0 });
    applyCrewSkinning(material, crew.walkTexture);
    return material;
  }, [crew.walkTexture]);

  /** 행렬 계산용 임시 객체. 프레임마다 새로 만들면 GC 부하가 측정값에 섞인다. */
  const transformProxy = useMemo(() => new Object3D(), []);
  const colorProxy = useMemo(() => new Color(), []);
  /** 좌석별 직전 좌표. 이동 거리로 걷기 사이클을 돌린다. */
  const lastPositions = useRef(new Map<number, { x: number; z: number }>());
  const renderedPlayers = useMemo(() => selectSpaceAvatarSlots(players), [players]);
  // endregion


  // region [Privates]
  /**
   * 지면에 서 있는지 지형에 묻는다.
   *
   * 전에는 `y <= 0` 으로 봤다. 바닥이 0 이던 벙커 기준이라 광장(5)·테라스(7.5)·
   * 궁전(11) 어디에 서 있어도 거짓이 되어 **다른 사람의 다리가 통째로 멈춰
   * 있었다.** 로컬 아바타의 같은 실수는 적분기가 넘겨주는 `isGrounded` 로
   * 고쳤지만(`PlayerAvatar`), 원격 아바타에는 적분기가 없어 여기만 남았다.
   *
   * 발밑이 열린 바다면 `resolveGroundY` 가 `-Infinity` 를 돌려주므로 떨어지는
   * 동안에도 다리가 선다.
   *
   * 레이캐스트는 **수평으로 움직이는 아바타만** 쏜다. 멈춘 아바타는 어차피
   * 블렌드가 0 으로 내려가 레스트 포즈가 되므로 접지를 알 필요가 없다.
   */
  const isStandingOnGround = (player: RemotePlayer): boolean => {
    const terrain = terrainRef.current;

    if (!terrain) {
      return true;
    }

    return player.y - terrain.resolveGroundY(player.x, player.z, player.y) <= GROUNDED_TOLERANCE_Y;
  };

  /** 앞치마 앞판만 플레이어 색을 받는다. 몸통 배색은 아틀라스 텍스처에 있다. */
  const applyInstanceColors = (): void => {
    renderedPlayers.forEach((player, instanceIndex) => {
      colorProxy.set(resolveAvatarColor(player.colorIndex));
      accentMeshRef.current?.setColorAt(instanceIndex, colorProxy);
    });

    if (accentMeshRef.current?.instanceColor) {
      accentMeshRef.current.instanceColor.needsUpdate = true;
    }
  };

  /**
   * 걸은 거리만큼 사이클을 돌린다.
   *
   * 시간이 아니라 거리를 기준으로 삼아야 발이 미끄러지지 않는다. 멈추면
   * 블렌드를 0 으로 당겨 레스트 포즈로 돌아간다.
   */
  const advanceWalkCycle = (deltaSeconds: number): void => {
    const phases = body.phase;
    const blends = body.blend;

    renderedPlayers.forEach((player, instanceIndex) => {
      const previous = lastPositions.current.get(player.seat);
      const moved = previous ? Math.hypot(player.x - previous.x, player.z - previous.z) : 0;
      lastPositions.current.set(player.seat, { x: player.x, z: player.z });

      const phase = phases.getX(instanceIndex) + moved / CREW_WALK.metersPerCycle;
      phases.setX(instanceIndex, phase - Math.floor(phase));

      // 공중에서는 다리를 멈춘다. 뛰는 중에 걷는 모션이 돌면 허우적대 보인다.
      const isMoving =
        deltaSeconds > 0 &&
        moved / deltaSeconds > MOVING_SPEED_THRESHOLD &&
        isStandingOnGround(player);
      const step = deltaSeconds / CREW_WALK.blendSeconds;
      const blend = blends.getX(instanceIndex) + (isMoving ? step : -step);
      blends.setX(instanceIndex, Math.min(1, Math.max(0, blend)));
    });

    // 앞치마와 눈은 몸통과 같은 위상이어야 따로 놀지 않는다. 복사를 먼저 하지 않으면
    // 한 프레임 뒤처진 값이 올라간다.
    for (const part of [accent, pupilGlint]) {
      if (!part) {
        continue;
      }
      part.phase.array.set(phases.array);
      part.blend.array.set(blends.array);
    }
    for (const attribute of [
      phases,
      blends,
      accent.phase,
      accent.blend,
      pupilGlint?.phase,
      pupilGlint?.blend,
    ]) {
      if (attribute) {
        attribute.needsUpdate = true;
      }
    }
  };

  const applyInstanceTransforms = (): void => {
    renderedPlayers.forEach((player, instanceIndex) => {
      // 모델은 발바닥이 원점이라 좌표를 그대로 쓴다. y 는 점프 중에만 0 이 아니다.
      transformProxy.rotation.set(0, player.yaw, 0);
      transformProxy.position.set(player.x, player.y, player.z);
      transformProxy.updateMatrix();
      bodyMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
      accentMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
      pupilGlintMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);

      // 그림자 평면은 눕혀야 하므로 회전을 따로 준다.
      transformProxy.rotation.set(-Math.PI / 2, 0, 0);
      transformProxy.position.set(player.x, SHADOW_LIFT_Y, player.z);
      transformProxy.updateMatrix();
      shadowMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
    });

    for (const meshRef of [bodyMeshRef, accentMeshRef, pupilGlintMeshRef, shadowMeshRef]) {
      if (meshRef.current) {
        meshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    applyInstanceColors();
  }, [renderedPlayers]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
      // 사본과 직접 만든 머티리얼만 정리한다. 공유 원본은 useGLTF 캐시가 가진다.
      body.geometry.dispose();
      accent.geometry.dispose();
      pupilGlint?.geometry.dispose();
      accentMaterial.dispose();
    };
  }, [shadowTexture, body, accent, pupilGlint, accentMaterial]);

  useFrame((_, deltaSeconds) => {
    applyInstanceTransforms();
    advanceWalkCycle(deltaSeconds);
  });
  // endregion

  return (
    <>
      {/*
        `frustumCulled={false}` 는 필수다. three 는 InstancedMesh 의 바운딩 스피어를
        `boundingSphere === null` 일 때 **한 번만** 계산하고 인스턴스가 움직여도 다시
        계산하지 않는다. 접속자가 없을 때(count 0) 첫 검사가 돌면 빈 구(반지름 -1)로
        굳어 이후 들어온 아바타가 통째로 컬링된다. 명찰은 DOM 이라 그대로 보여서
        "사람은 투명한데 닉네임만 뜨는" 상태가 된다.
      */}
      {/* `dispose={null}` 로 useGLTF 캐시의 공유 머티리얼이 해제되지 않게 막는다. */}
      <instancedMesh
        ref={bodyMeshRef}
        count={renderedPlayers.length}
        args={[body.geometry, bodyMaterial, SPACE_MAX_OCCUPANTS]}
        frustumCulled={false}
        dispose={null}
      />

      <instancedMesh
        ref={accentMeshRef}
        count={renderedPlayers.length}
        args={[accent.geometry, accentMaterial, SPACE_MAX_OCCUPANTS]}
        frustumCulled={false}
        dispose={null}
      />

      {pupilGlint && pupilGlintMaterial && (
        <instancedMesh
          ref={pupilGlintMeshRef}
          count={renderedPlayers.length}
          args={[pupilGlint.geometry, pupilGlintMaterial, SPACE_MAX_OCCUPANTS]}
          frustumCulled={false}
          dispose={null}
        />
      )}

      <instancedMesh
        ref={shadowMeshRef}
        count={renderedPlayers.length}
        args={[undefined, undefined, SPACE_MAX_OCCUPANTS]}
        frustumCulled={false}
      >
        <planeGeometry args={[SPACE_AVATAR.shadowRadius * 2, SPACE_AVATAR.shadowRadius * 2]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </instancedMesh>
    </>
  );
}

const MemoizedRemoteAvatarGroup = memo(RemoteAvatarGroup);
MemoizedRemoteAvatarGroup.displayName = "RemoteAvatarGroup";

interface RemoteAvatarsProps {
  players: readonly RemotePlayer[];
  /** 같은 배열의 로스터 변경에도 모델별 묶음을 다시 계산하게 한다. */
  rosterRevision?: number;
  /** 접지 판정용. 원격 아바타는 적분기가 없어 지형에 직접 묻는다. */
  terrainRef: RefObject<SpaceTerrain>;
}

/**
 * 원격 아바타를 **모델별로 나눠** 그린다.
 *
 * 모델마다 지오메트리가 다르니 하나의 `InstancedMesh` 에 담을 수 없다. 사람이
 * 있는 모델만 그룹을 띄우므로, 아무도 곰을 고르지 않았으면 곰 에셋을 받지도
 * 않는다. 그룹마다 `Suspense` 로 감싸는 이유는, 새 모델이 로드되는 동안 씬
 * 전체가 사라지지 않게 하기 위함이다.
 */
function RemoteAvatars({ players, rosterRevision, terrainRef }: RemoteAvatarsProps): ReactNode {
  // region [Hooks]
  const groups = useMemo(() => groupPlayersByModel(players), [players, rosterRevision]);
  // endregion

  return (
    <>
      {groups.map((group) => (
        <Suspense key={group.modelIndex} fallback={null}>
          <MemoizedRemoteAvatarGroup
            model={resolveAvatarModel(group.modelIndex)}
            players={group.players}
            terrainRef={terrainRef}
          />
        </Suspense>
      ))}
    </>
  );
}

const MemoizedRemoteAvatars = memo(RemoteAvatars);
MemoizedRemoteAvatars.displayName = "RemoteAvatars";

export default MemoizedRemoteAvatars;
