"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useEffect, useMemo, useRef } from "react";
import { type InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import {
  type LocalPlayerState,
  resolveAvatarColor,
  resolveAvatarModel,
  SPACE_AVATAR,
  SPACE_KICK,
} from "@/entities/space";
import { createAvatarAnimation, stepAvatarAnimation } from "@/views/space/lib/avatarAnimation";
import { useCrewModel } from "@/views/space/lib/crewModel";
import {
  applyCrewSkinning,
  createCrewInstanceGeometry,
  syncCrewPose,
  useSkinnedCrewMaterial,
  writeCrewPose,
} from "@/views/space/lib/crewSkinning";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 그림자 블롭이 바닥 격자와 겹쳐 지저분해지지 않도록 살짝 띄움. */
const SHADOW_LIFT_Y = 0.02;

interface PlayerAvatarProps {
  colorIndex: number;
  /** 아바타 모델 번호. 남이 보는 내 모습과 같아야 하므로 서버 값을 씀. */
  modelIndex: number;
  hasRealtimeShadows: boolean;
  /** 걷기 사이클 속도. 매 프레임 바뀌므로 ref 로 받음. */
  playerStateRef: RefObject<LocalPlayerState>;
  /** 공격을 시작한 `performance.now()` 시각. 안 했으면 `undefined`. */
  kickStartedAtRef: RefObject<number | undefined>;
  /** 보스에게 마지막으로 맞은 시각. 움찔하는 모션을 틂. */
  damagedAt: number | null;
  /** 쓰러져 있는 끝 시각. 그때까지 쓰러졌다가 그 시각에 맞춰 일어남. */
  knockedOutUntil: number | null;
  /** 모델을 받아 처음 그려질 때. 모델을 바꿔 다시 올라와도 또 부름. */
  onReady?: () => void;
}

/**
 * 로컬 플레이어 아바타.
 *
 * 지오메트리·재질·모션 모두 `RemoteAvatars` 와 같아야 함. 한쪽만 바꾸면 내 모습과 남이
 * 보는 내 모습이 달라짐. 셰이더를 공유하려고 혼자여도 `InstancedMesh`(count 1)로 그림.
 * 모델은 발바닥이 원점이라 그룹을 바닥에 그대로 둠.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function PlayerAvatar({ colorIndex, modelIndex, hasRealtimeShadows, playerStateRef, kickStartedAtRef, damagedAt, knockedOutUntil, onReady }: PlayerAvatarProps): ReactNode {
  // region [Hooks]
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const avatarColor = useMemo(() => resolveAvatarColor(colorIndex), [colorIndex]);
  const model = resolveAvatarModel(modelIndex);
  const crew = useCrewModel(model);
  const bodyMaterial = useSkinnedCrewMaterial(crew.bodyMaterial, crew.clipTexture);
  const pupilGlintMaterial = useSkinnedCrewMaterial(crew.pupilGlintMaterial, crew.clipTexture);
  const body = useMemo(() => createCrewInstanceGeometry(crew.bodyGeometry, 1), [crew.bodyGeometry]);
  /** 눈 메시가 없는 모델에서는 `null` 임. 메시도 그리지 않음. */
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
    applyCrewSkinning(material, crew.clipTexture);
    return material;
  }, [crew.clipTexture]);
  /** 지금 틀고 있는 모션. 매 프레임 제자리에서 고침. */
  const animation = useMemo(() => createAvatarAnimation(), []);

  // 혼자라 인스턴스 색이 필요 없음. 머티리얼에 바로 넣음.
  accentMaterial.color.set(avatarColor);
  const bodyMeshRef = useRef<InstancedMesh>(null);
  const pupilGlintMeshRef = useRef<InstancedMesh>(null);
  const accentMeshRef = useRef<InstancedMesh>(null);
  // endregion


  // region [Privates]
  /** 지금 상태에 맞는 모션을 골라 모든 부위에 같은 포즈를 넣음. 한 부위만 늦으면 눈·색 띠가 따로 놂. */
  const advanceAnimation = (deltaSeconds: number): void => {
    const state = playerStateRef.current;

    stepAvatarAnimation(
      animation,
      {
        nowMs: performance.now(),
        deltaSeconds,
        speed: state ? Math.hypot(state.velocityX, state.velocityZ) : 0,
        // 접지 판정은 지형이 정하고 적분기가 넘겨줌.
        isGrounded: state?.isGrounded ?? true,
        attackStartedAt: kickStartedAtRef.current,
        attackSeconds: SPACE_KICK.animationSeconds,
        hitStartedAt: damagedAt ?? undefined,
        // 쓰러뜨린 피격 시각부터 다시 움직일 수 있는 시각까지.
        knockout:
          damagedAt !== null && knockedOutUntil !== null
            ? { startedAt: damagedAt, until: knockedOutUntil }
            : undefined,
      },
      model,
    );
    writeCrewPose(body, 0, animation);
    syncCrewPose(body, [accent, pupilGlint]);
  };

  /** 그룹이 위치를 잡으므로 인스턴스 행렬은 단위행렬 한 번만 넣음. */
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

  // 훅이 서스펜드하지 않고 여기까지 왔으면 모델이 다 받아진 것임.
  useEffect(() => {
    onReady?.();
  }, [crew, onReady]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
      // 사본과 직접 만든 머티리얼만 정리함. 공유 원본은 useGLTF 캐시가 가짐.
      body.geometry.dispose();
      accent.geometry.dispose();
      pupilGlint?.geometry.dispose();
      accentMaterial.dispose();
    };
  }, [shadowTexture, body, accent, pupilGlint, accentMaterial]);

  useFrame((_, deltaSeconds) => {
    advanceAnimation(deltaSeconds);
  });
  // endregion

  return (
    // 모델 파일은 그대로 두고 그릴 때만 키움. 그림자도 같이 커짐.
    <group scale={SPACE_AVATAR.scale}>
      {/* `dispose={null}` 로 useGLTF 캐시의 공유 머티리얼이 해제되지 않게 막음. */}
      <instancedMesh
        ref={bodyMeshRef}
        args={[body.geometry, bodyMaterial, 1]}
        count={1}
        castShadow={hasRealtimeShadows}
        frustumCulled={false}
        dispose={null}
      />

      {/* 가슴 띠만 플레이어 색을 받음. 텍스처를 쓰지 않아야 색이 그대로 나옴. */}
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
    </group>
  );
}

const MemoizedPlayerAvatar = memo(PlayerAvatar);
MemoizedPlayerAvatar.displayName = "PlayerAvatar";

export default MemoizedPlayerAvatar;
