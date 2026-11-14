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
  SPACE_NETWORK_INTERVAL_MS,
  type SpaceAvatarModel,
  type SpaceTerrain,
} from "@/entities/space";
import {
  AVATAR_MOTION,
  type AvatarAnimation,
  type AvatarMotionInput,
  createAvatarAnimation,
  stepAvatarAnimation,
} from "@/views/space/lib/avatarAnimation";
import { groupPlayersByModel, selectSpaceAvatarSlots } from "@/views/space/lib/avatarCapacity";
import { useCrewModel } from "@/views/space/lib/crewModel";
import {
  applyCrewSkinning,
  createCrewInstanceGeometry,
  syncCrewPose,
  useSkinnedCrewMaterial,
  writeCrewPose,
} from "@/views/space/lib/crewSkinning";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

const SHADOW_LIFT_Y = 0.02;
/**
 * 지면에 서 있다고 보는 높이 차.
 *
 * 로컬 아바타처럼 정확히 같을 수는 없음. 원격 좌표는 1 cm 로 양자화돼 오고
 * 두 스냅샷 사이를 보간하므로, 계단(한 칸 25 cm)을 오르는 중에는 보간된 `y` 가
 * 실제 디딤면과 최대 12 cm 쯤 벌어짐. 점프 정점(1.13 m)보다는 한참 낮아
 * 공중을 접지로 오판하지 않음.
 */
const GROUNDED_TOLERANCE_Y = 0.2;
/**
 * 접지를 다시 묻는 간격(ms). 서버가 위치를 보내는 간격과 같음.
 *
 * 그 사이의 위치는 두 스냅샷을 이은 값이라 더 자주 물어도 새로 알게 되는 게 없음.
 * 매 프레임 물으면 움직이는 사람 수만큼 레이캐스트가 나감(50명이면 프레임당 50번).
 */
const GROUND_CHECK_INTERVAL_MS = SPACE_NETWORK_INTERVAL_MS;
/** 접지 확인을 이만큼의 박자로 흩음. 다 같은 프레임에 몰리면 그 프레임만 무거워짐. */
const GROUND_CHECK_STAGGER_STEPS = 6;

/** 좌석 하나의 프레임 간 기록. 자리가 바뀌어도(인스턴스 번호가 밀려도) 사람을 따라감. */
interface RemoteAvatarTrack {
  /** 틀고 있는 모션. */
  animation: AvatarAnimation;
  /** 직전 프레임의 좌표. 이동 거리로 속도를 구함. 첫 프레임에는 `NaN` 임. */
  x: number;
  z: number;
  /** 마지막으로 확인한 접지 여부와 그 시각. */
  isGrounded: boolean;
  groundCheckedAt: number;
  /** 마지막으로 그린 프레임 번호. 나간 사람을 가리는 데 씀. */
  seenFrame: number;
}

/** 남이 보스에게 맞은 기록. */
export interface RemoteAvatarHit {
  /** 맞은 시각(`performance.now()`). */
  hitAt: number;
  /** 쓰러졌으면 다시 움직일 수 있는 시각. 아니면 `undefined`. */
  knockedOutUntil: number | undefined;
}

interface RemoteAvatarGroupProps {
  /** 이 그룹이 쓰는 모델. 그룹 하나가 `InstancedMesh` 4개(몸통·색 띠·눈·그림자)를 씀. */
  model: SpaceAvatarModel;
  players: readonly RemotePlayer[];
  /** 접지 판정용. 원격 아바타는 적분기가 없어 지형에 직접 물음. */
  terrainRef: RefObject<SpaceTerrain>;
  /** 좌석별 발차기 시작 시각(`performance.now()`). 씬이 받은 이벤트로 채움. */
  kickStartsRef: RefObject<Map<number, number>>;
  /** 좌석별 피격 기록. 씬이 받은 이벤트로 채움. */
  hitsRef: RefObject<Map<number, RemoteAvatarHit>>;
}

/**
 * 같은 모델을 고른 원격 아바타를 인스턴싱으로 그림.
 *
 * 개별 `<mesh>` 로 만들면 50명이면 부위마다 50 콜씩 쌓여 모바일 예산(50)을 몇 배
 * 넘김. `InstancedMesh` 4개로 고정해 그룹 전원을 드로우 콜 4개에 담음. 모션은
 * 구워 둔 본 행렬을 셰이더가 읽어 처리함. 근거는 `docs/btc-space-3d.md` §8 에 있음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function RemoteAvatarGroup({ model, players, terrainRef, kickStartsRef, hitsRef }: RemoteAvatarGroupProps): ReactNode {
  // region [Hooks]
  const bodyMeshRef = useRef<InstancedMesh>(null);
  const accentMeshRef = useRef<InstancedMesh>(null);
  const pupilGlintMeshRef = useRef<InstancedMesh>(null);
  const weaponMeshRef = useRef<InstancedMesh>(null);
  const shadowMeshRef = useRef<InstancedMesh>(null);
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const crew = useCrewModel(model);
  const bodyMaterial = useSkinnedCrewMaterial(crew.bodyMaterial, crew.clipTexture);
  const pupilGlintMaterial = useSkinnedCrewMaterial(crew.pupilGlintMaterial, crew.clipTexture);
  const weaponMaterial = useSkinnedCrewMaterial(crew.weaponMaterial, crew.clipTexture);

  /** 공유 지오메트리에 인스턴스 버퍼를 직접 달면 로컬 플레이어와 서로 덮어씀. */
  const body = useMemo(
    () => createCrewInstanceGeometry(crew.bodyGeometry, SPACE_MAX_OCCUPANTS),
    [crew.bodyGeometry],
  );
  const accent = useMemo(
    () => createCrewInstanceGeometry(crew.accentGeometry, SPACE_MAX_OCCUPANTS),
    [crew.accentGeometry],
  );
  /** 눈 메시가 없는 모델에서는 `null` 임. 메시도 그리지 않음. */
  const pupilGlint = useMemo(
    () =>
      crew.pupilGlintGeometry
        ? createCrewInstanceGeometry(crew.pupilGlintGeometry, SPACE_MAX_OCCUPANTS)
        : null,
    [crew.pupilGlintGeometry],
  );
  /** 무기를 몸통에 합친 모델에서는 `null` 임. 따로 그리는 모델은 드로우 콜이 하나 늚. */
  const weapon = useMemo(
    () =>
      crew.weaponGeometry
        ? createCrewInstanceGeometry(crew.weaponGeometry, SPACE_MAX_OCCUPANTS)
        : null,
    [crew.weaponGeometry],
  );
  const accentMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({ roughness: 0.84, metalness: 0 });
    applyCrewSkinning(material, crew.clipTexture);
    return material;
  }, [crew.clipTexture]);

  /** 행렬 계산용 임시 객체. 프레임마다 새로 만들면 GC 부하가 측정값에 섞임. */
  const transformProxy = useMemo(() => {
    const proxy = new Object3D();
    // 모델 파일은 그대로 두고 그릴 때만 키움. 몸과 그림자 행렬에 같이 들어감.
    proxy.scale.setScalar(SPACE_AVATAR.scale);
    return proxy;
  }, []);
  const colorProxy = useMemo(() => new Color(), []);
  const tracks = useRef(new Map<number, RemoteAvatarTrack>());
  const frameNumberRef = useRef<number>(0);
  /** 모션 계산에 넘기는 입력. 사람마다 값만 바꿔 돌려 씀(받는 쪽이 들고 있지 않음). */
  const motionInput = useMemo<AvatarMotionInput>(
    () => ({
      nowMs: 0,
      deltaSeconds: 0,
      speed: 0,
      isGrounded: true,
      attackStartedAt: undefined,
      attackSeconds: 0,
      hitStartedAt: undefined,
      knockout: undefined,
    }),
    [],
  );
  const knockoutProxy = useMemo(() => ({ startedAt: 0, until: 0 }), []);
  const renderedPlayers = useMemo(() => selectSpaceAvatarSlots(players), [players]);
  // endregion


  // region [Privates]
  /**
   * 지면에 서 있는지 지형에 물음.
   *
   * 높이를 상수(`y <= 0`)로 보면 안 됨. 홀 바닥 · 발코니 · 안뜰이 높이가 다 달라서
   * 바닥이 0 이 아닌 곳에 선 사람은 다리가 통째로 멈춤. 로컬 아바타는 적분기가
   * `isGrounded` 를 넘겨주지만(`PlayerAvatar`), 원격 아바타에는 적분기가 없어 지형에 물음.
   *
   * 발밑에 아무것도 없으면 `resolveGroundY` 가 `-Infinity` 를 돌려주므로 떨어지는
   * 동안에도 다리가 섬.
   */
  const isStandingOnGround = (player: RemotePlayer): boolean => {
    const terrain = terrainRef.current;

    if (!terrain) {
      return true;
    }

    return player.y - terrain.resolveGroundY(player.x, player.z, player.y) <= GROUNDED_TOLERANCE_Y;
  };

  /**
   * 접지 여부. 지형에는 `GROUND_CHECK_INTERVAL_MS` 에 한 번만 묻고 그 사이에는 기억해 둔 값을 씀.
   *
   * **수평으로 움직이는 아바타만** 부름. 멈춘 아바타는 어차피 서 있는 모션이라 접지를 알
   * 필요가 없음. 점프하는 순간과 착지하는 순간에는 다리 모션이 이 간격만큼 늦게 바뀜.
   */
  const resolveGrounded = (track: RemoteAvatarTrack, player: RemotePlayer, now: number): boolean => {
    if (now - track.groundCheckedAt >= GROUND_CHECK_INTERVAL_MS) {
      track.isGrounded = isStandingOnGround(player);
      track.groundCheckedAt = now;
    }

    return track.isGrounded;
  };

  const createTrack = (seat: number, now: number): RemoteAvatarTrack => ({
    animation: createAvatarAnimation(),
    x: Number.NaN,
    z: Number.NaN,
    // 서 있다고 보고 시작함. 첫 확인은 좌석마다 조금씩 어긋나게 잡아 한 프레임에 안 몰리게 함.
    isGrounded: true,
    groundCheckedAt:
      now - (GROUND_CHECK_INTERVAL_MS * (seat % GROUND_CHECK_STAGGER_STEPS)) / GROUND_CHECK_STAGGER_STEPS,
    seenFrame: 0,
  });

  /** 가슴 띠만 플레이어 색을 받음. 몸통 배색은 아틀라스 텍스처에 있음. */
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
   * 사람마다 지금 틀 모션을 골라 포즈를 넣음.
   *
   * 속도는 직전 프레임과의 이동 거리로 구함. 남의 위치는 보간된 값이라 이게 화면에서
   * 실제로 움직인 속도임. 공격·피격은 좌석마다 받아 둔 시각으로 진행도를 구함.
   * 맞아서 밀리는 동안에도 위치는 움직이지만 피격 모션이 걷기보다 먼저라 달려 보이지 않음.
   */
  const advanceAnimations = (deltaSeconds: number): void => {
    const now = performance.now();
    const frameNumber = frameNumberRef.current + 1;

    frameNumberRef.current = frameNumber;
    motionInput.nowMs = now;
    motionInput.deltaSeconds = deltaSeconds;
    motionInput.attackSeconds = model.combat.attackSeconds;

    for (let instanceIndex = 0; instanceIndex < renderedPlayers.length; instanceIndex += 1) {
      const player = renderedPlayers[instanceIndex];
      let track = tracks.current.get(player.seat);

      if (!track) {
        track = createTrack(player.seat, now);
        tracks.current.set(player.seat, track);
      }
      // 처음 본 프레임에는 직전 좌표가 없어 멈춘 것으로 봄.
      const moved = Number.isNaN(track.x) ? 0 : Math.hypot(player.x - track.x, player.z - track.z);
      const speed = deltaSeconds > 0 ? moved / deltaSeconds : 0;
      const hit = hitsRef.current?.get(player.seat);

      track.x = player.x;
      track.z = player.z;
      track.seenFrame = frameNumber;

      motionInput.speed = speed;
      // 공중에서는 다리를 멈춤. 멈춰 있으면 지형에 물을 필요가 없음.
      motionInput.isGrounded =
        speed <= AVATAR_MOTION.movingSpeed || resolveGrounded(track, player, now);
      motionInput.attackStartedAt = kickStartsRef.current?.get(player.seat);
      motionInput.hitStartedAt = hit?.hitAt;

      if (hit?.knockedOutUntil === undefined) {
        motionInput.knockout = undefined;
      } else {
        knockoutProxy.startedAt = hit.hitAt;
        knockoutProxy.until = hit.knockedOutUntil;
        motionInput.knockout = knockoutProxy;
      }

      stepAvatarAnimation(track.animation, motionInput, model);
      writeCrewPose(body, instanceIndex, track.animation);
    }

    // 나간 사람의 기록을 지움. 같은 좌석에 다른 사람이 들어오면 처음부터 시작함.
    for (const [seat, track] of tracks.current) {
      if (track.seenFrame !== frameNumber) {
        tracks.current.delete(seat);
      }
    }

    // 색 띠·눈은 몸통과 같은 포즈여야 따로 안 놂.
    syncCrewPose(body, [accent, pupilGlint, weapon]);
  };

  const applyInstanceTransforms = (): void => {
    renderedPlayers.forEach((player, instanceIndex) => {
      // 모델은 발바닥이 원점이라 좌표를 그대로 씀. y 는 점프 중에만 0 이 아님.
      transformProxy.rotation.set(0, player.yaw, 0);
      transformProxy.position.set(player.x, player.y, player.z);
      transformProxy.updateMatrix();
      bodyMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
      accentMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
      pupilGlintMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
      weaponMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);

      // 그림자 평면은 눕혀야 하므로 회전을 따로 줌. 높이는 **발밑 기준**임.
      // 상수만 넣으면 발코니나 안뜰에 선 사람의 그림자가 다른 층 바닥에 깔림.
      // 로컬 아바타는 그림자가 플레이어 그룹 안에 있어 자연히 발밑을 따라간다(`PlayerAvatar`).
      transformProxy.rotation.set(-Math.PI / 2, 0, 0);
      transformProxy.position.set(player.x, player.y + SHADOW_LIFT_Y, player.z);
      transformProxy.updateMatrix();
      shadowMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
    });

    for (const meshRef of [bodyMeshRef, accentMeshRef, pupilGlintMeshRef, weaponMeshRef, shadowMeshRef]) {
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
      // 사본과 직접 만든 머티리얼만 정리함. 공유 원본은 useGLTF 캐시가 가짐.
      body.geometry.dispose();
      accent.geometry.dispose();
      pupilGlint?.geometry.dispose();
      weapon?.geometry.dispose();
      accentMaterial.dispose();
    };
  }, [shadowTexture, body, accent, pupilGlint, weapon, accentMaterial]);

  useFrame((_, deltaSeconds) => {
    applyInstanceTransforms();
    advanceAnimations(deltaSeconds);
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
      {/* `dispose={null}` 로 useGLTF 캐시의 공유 머티리얼이 해제되지 않게 막음. */}
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

      {weapon && weaponMaterial && (
        <instancedMesh
          ref={weaponMeshRef}
          count={renderedPlayers.length}
          args={[weapon.geometry, weaponMaterial, SPACE_MAX_OCCUPANTS]}
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
  /** 같은 배열의 로스터 변경에도 모델별 묶음을 다시 계산하게 함. */
  rosterRevision?: number;
  /** 접지 판정용. 원격 아바타는 적분기가 없어 지형에 직접 물음. */
  terrainRef: RefObject<SpaceTerrain>;
  /** 좌석별 발차기 시작 시각. */
  kickStartsRef: RefObject<Map<number, number>>;
  /** 좌석별 피격 기록. */
  hitsRef: RefObject<Map<number, RemoteAvatarHit>>;
}

/**
 * 원격 아바타를 **모델별로 나눠** 그림.
 *
 * 모델마다 지오메트리가 다르니 하나의 `InstancedMesh` 에 담을 수 없음. 사람이
 * 있는 모델만 그룹을 띄우므로, 아무도 안 쓰는 모델은 에셋을 받지도 않음.
 * 지금은 모델이 하나라 그룹도 하나임. 그룹마다 `Suspense` 로 감싸는 이유는, 새 모델이 로드되는 동안 씬
 * 전체가 사라지지 않게 하기 위함임.
 */
function RemoteAvatars({
  players,
  rosterRevision,
  terrainRef,
  kickStartsRef,
  hitsRef,
}: RemoteAvatarsProps): ReactNode {
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
            kickStartsRef={kickStartsRef}
            hitsRef={hitsRef}
          />
        </Suspense>
      ))}
    </>
  );
}

const MemoizedRemoteAvatars = memo(RemoteAvatars);
MemoizedRemoteAvatars.displayName = "RemoteAvatars";

export default MemoizedRemoteAvatars;
