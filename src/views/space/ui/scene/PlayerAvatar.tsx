"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useEffect, useMemo, useRef } from "react";
import { type InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import {
  type LocalPlayerState,
  resolveAvatarColor,
  resolveAvatarModel,
  SPACE_AVATAR,
} from "@/entities/space";
import { CREW_WALK, useCrewModel } from "@/views/space/lib/crewModel";
import {
  applyCrewSkinning,
  createCrewInstanceGeometry,
  useSkinnedCrewMaterial,
} from "@/views/space/lib/crewSkinning";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 그림자 블롭이 바닥 격자와 겹쳐 지저분해지지 않도록 살짝 띄운다. */
const SHADOW_LIFT_Y = 0.02;
/** 이보다 느리면 멈춘 것으로 보고 레스트 포즈로 돌린다. */
const MOVING_SPEED_THRESHOLD = 0.25;

interface PlayerAvatarProps {
  colorIndex: number;
  /** 고른 아바타 모델 번호. 남이 보는 내 모습과 같아야 하므로 서버 값을 쓴다. */
  modelIndex: number;
  hasRealtimeShadows: boolean;
  /** 걷기 사이클 속도. 매 프레임 바뀌므로 ref 로 받는다. */
  playerStateRef: RefObject<LocalPlayerState>;
}

/**
 * 로컬 플레이어 아바타.
 *
 * 지오메트리·재질·걷기 모션 모두 `RemoteAvatars` 와 같아야 한다. 한쪽만 바꾸면
 * 내 모습과 남이 보는 내 모습이 달라진다. 셰이더를 공유하려고 혼자여도
 * `InstancedMesh`(count 1)로 그린다. 모델은 발바닥이 원점이라 그룹을 바닥에
 * 그대로 둔다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function PlayerAvatar({ colorIndex, modelIndex, hasRealtimeShadows, playerStateRef }: PlayerAvatarProps): ReactNode {
  // region [Hooks]
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const avatarColor = useMemo(() => resolveAvatarColor(colorIndex), [colorIndex]);
  const crew = useCrewModel(resolveAvatarModel(modelIndex));
  const bodyMaterial = useSkinnedCrewMaterial(crew.bodyMaterial, crew.walkTexture);
  const pupilGlintMaterial = useSkinnedCrewMaterial(crew.pupilGlintMaterial, crew.walkTexture);
  const body = useMemo(() => createCrewInstanceGeometry(crew.bodyGeometry, 1), [crew.bodyGeometry]);
  /** 글린트가 없는 모델(곰)에서는 `null` 이다. 메시도 그리지 않는다. */
  const pupilGlint = useMemo(
    () => (crew.pupilGlintGeometry ? createCrewInstanceGeometry(crew.pupilGlintGeometry, 1) : null),
    [crew.pupilGlintGeometry],
  );
  const accent = useMemo(
    () => createCrewInstanceGeometry(crew.accentGeometry, 1),
    [crew.accentGeometry],
  );
  const accentMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({ roughness: 0.84, metalness: 0 });
    applyCrewSkinning(material, crew.walkTexture);
    return material;
  }, [crew.walkTexture]);

  // 혼자라 인스턴스 색이 필요 없다. 머티리얼에 바로 넣는다.
  accentMaterial.color.set(avatarColor);
  const bodyMeshRef = useRef<InstancedMesh>(null);
  const pupilGlintMeshRef = useRef<InstancedMesh>(null);
  const accentMeshRef = useRef<InstancedMesh>(null);
  // endregion


  // region [Privates]
  /** 걸은 거리만큼 사이클을 돌린다. 시간 기준으로 돌리면 발이 미끄러진다. */
  const advanceWalkCycle = (deltaSeconds: number): void => {
    const state = playerStateRef.current;
    // 공중에서는 다리를 멈춘다. 뛰는 중에 걷는 모션이 돌면 허우적대 보인다.
    const speed = state && state.y <= 0 ? Math.hypot(state.velocityX, state.velocityZ) : 0;

    const phase = body.phase.getX(0) + (speed * deltaSeconds) / CREW_WALK.metersPerCycle;
    const step = deltaSeconds / CREW_WALK.blendSeconds;
    const blend = body.blend.getX(0) + (speed > MOVING_SPEED_THRESHOLD ? step : -step);

    for (const buffers of [body, accent, pupilGlint]) {
      if (!buffers) {
        continue;
      }

      buffers.phase.setX(0, phase - Math.floor(phase));
      buffers.blend.setX(0, Math.min(1, Math.max(0, blend)));
      buffers.phase.needsUpdate = true;
      buffers.blend.needsUpdate = true;
    }
  };

  /** 그룹이 위치를 잡으므로 인스턴스 행렬은 단위행렬 한 번만 넣는다. */
  const resetInstanceMatrix = (): void => {
    const identity = new Object3D();
    identity.updateMatrix();
    for (const meshRef of [bodyMeshRef, accentMeshRef, pupilGlintMeshRef]) {
      meshRef.current?.setMatrixAt(0, identity.matrix);
      if (meshRef.current) {
        meshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(resetInstanceMatrix, []);

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
    advanceWalkCycle(deltaSeconds);
  });
  // endregion

  return (
    <>
      {/* `dispose={null}` 로 useGLTF 캐시의 공유 머티리얼이 해제되지 않게 막는다. */}
      <instancedMesh
        ref={bodyMeshRef}
        args={[body.geometry, bodyMaterial, 1]}
        count={1}
        castShadow={hasRealtimeShadows}
        frustumCulled={false}
        dispose={null}
      />

      {/* 앞치마 앞판만 플레이어 색을 받는다. 텍스처를 쓰지 않아야 색이 그대로 나온다. */}
      <instancedMesh
        ref={accentMeshRef}
        args={[accent.geometry, accentMaterial, 1]}
        count={1}
        castShadow={hasRealtimeShadows}
        frustumCulled={false}
        dispose={null}
      />

      {pupilGlint && pupilGlintMaterial && (
        <instancedMesh
          ref={pupilGlintMeshRef}
          args={[pupilGlint.geometry, pupilGlintMaterial, 1]}
          count={1}
          frustumCulled={false}
          dispose={null}
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SHADOW_LIFT_Y, 0]}>
        <planeGeometry args={[SPACE_AVATAR.shadowRadius * 2, SPACE_AVATAR.shadowRadius * 2]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

const MemoizedPlayerAvatar = memo(PlayerAvatar);
MemoizedPlayerAvatar.displayName = "PlayerAvatar";

export default MemoizedPlayerAvatar;
