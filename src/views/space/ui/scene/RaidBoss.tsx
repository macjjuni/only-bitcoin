"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import type { Mesh, MeshBasicMaterial } from "three";
import { SPACE_BOSS, type SpaceBossState } from "@/entities/space";
import { type BossAnimator, createBossAnimator } from "@/views/space/lib/bossAnimator";
import { useBossModel } from "@/views/space/lib/bossModel";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 접지 그림자 지름(m). 어깨 폭(4.3 m)보다 조금 넓게 잡았음. */
const SHADOW_DIAMETER = 5.6;
/** 바닥 예고 표시(최대 5.4 cm)보다 아래에 깔아 예고를 가리지 않게 함. */
const SHADOW_LIFT_Y = 0.008;

interface RaidBossProps {
  /**
   * 그릴 보스 상태. **같은 객체를 제자리에서 고쳐서** 넘김.
   *
   * 매 프레임 바뀌는 값이라 새 객체로 넘기면 보스가 한 걸음 걸을 때마다 씬이 다시 그려짐.
   * 여기서는 `useFrame` 안에서만 읽음.
   */
  bossState: SpaceBossState;
}

/**
 * 레이드 보스.
 *
 * 안뜰 바닥이 라이트맵 언릿이라 실시간 그림자를 못 받음. 아바타처럼 블롭 그림자를 깖.
 * 모델은 발바닥이 원점이고, 위치는 애니메이터가 씬 그래프 안의 몸 노드에 직접 넣음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function RaidBoss({ bossState }: RaidBossProps): ReactNode {
  // region [Hooks]
  const model = useBossModel();
  /**
   * 모션 재생기. **effect 에서 만들고 effect 에서 버림.**
   *
   * `useMemo` 로 만들면 개발 모드(StrictMode)가 정리 함수를 한 번 미리 돌릴 때 해제된
   * 재생기를 계속 쓰게 됨. 그러면 믹서가 깨져 걷기·달리기가 재생되지 않았음.
   */
  const animatorRef = useRef<BossAnimator | null>(null);
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const shadowMeshRef = useRef<Mesh>(null);
  const shadowMaterialRef = useRef<MeshBasicMaterial>(null);
  // endregion


  // region [Privates]
  /** 그림자를 발밑에 붙이고, 땅속에 있는 만큼 옅게 함. */
  const applyShadow = (emergence: number): void => {
    const shadowMesh = shadowMeshRef.current;
    const shadowMaterial = shadowMaterialRef.current;

    if (!shadowMesh || !shadowMaterial) {
      return;
    }

    shadowMesh.visible = emergence > 0;
    shadowMesh.position.set(
      model.rig.position.x,
      SPACE_BOSS.arena.floorY + SHADOW_LIFT_Y,
      model.rig.position.z,
    );
    shadowMaterial.opacity = emergence;
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const animator = createBossAnimator(model);

    animatorRef.current = animator;

    return () => {
      animatorRef.current = null;
      animator.dispose();
    };
  }, [model]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
    };
  }, [shadowTexture]);

  useFrame((_, deltaSeconds) => {
    const animator = animatorRef.current;

    if (!animator) {
      return;
    }

    applyShadow(animator.update(bossState, performance.now(), deltaSeconds));
  });
  // endregion

  return (
    <>
      {/* `dispose={null}` 로 로더 캐시의 지오메트리·머티리얼이 언마운트에서 해제되지 않게 막음. */}
      <primitive object={model.scene} dispose={null} />

      <mesh ref={shadowMeshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[SHADOW_DIAMETER, SHADOW_DIAMETER]} />
        <meshBasicMaterial
          ref={shadowMaterialRef}
          map={shadowTexture}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

const MemoizedRaidBoss = memo(RaidBoss);
MemoizedRaidBoss.displayName = "RaidBoss";

export default MemoizedRaidBoss;
