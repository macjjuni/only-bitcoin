"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { SPACE_BOSS, type SpaceBossState } from "@/entities/space";
import type { BossHealth } from "@/features/space-session";
import { type BossAnimator, createBossAnimator } from "@/views/space/lib/bossAnimator";
import { BOSS_NAME } from "@/views/space/lib/bossHud";
import { useBossModel } from "@/views/space/lib/bossModel";
import { COMBAT_OVERLAY_DISTANCE_FACTOR } from "@/views/space/lib/overlayLayout";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 접지 그림자 지름(m). 어깨 폭(4.3 m)보다 조금 넓게 잡았음. */
const SHADOW_DIAMETER = 5.6;
/** 바닥 예고 표시(최대 5.4 cm)보다 아래에 깔아 예고를 가리지 않게 함. */
const SHADOW_LIFT_Y = 0.008;
/** 체력판을 정수리에서 띄우는 높이(m). */
const HEALTH_PLATE_LIFT = 0.6;

interface RaidBossProps {
  /**
   * 그릴 보스 상태. **같은 객체를 제자리에서 고쳐서** 넘김.
   *
   * 매 프레임 바뀌는 값이라 새 객체로 넘기면 보스가 한 걸음 걸을 때마다 씬이 다시 그려짐.
   * 여기서는 `useFrame` 안에서만 읽음.
   */
  bossState: SpaceBossState;
  /** 보스 체력. 매 프레임 불러 머리 위 체력판에 씀. */
  getBossHealth: () => BossHealth | null;
}

/**
 * 레이드 보스.
 *
 * 안뜰 바닥이 라이트맵 언릿이라 실시간 그림자를 못 받음. 아바타처럼 블롭 그림자를 깖.
 * 모델은 발바닥이 원점이고, 위치는 애니메이터가 씬 그래프 안의 몸 노드에 직접 넣음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function RaidBoss({ bossState, getBossHealth }: RaidBossProps): ReactNode {
  // region [Hooks]
  const model = useBossModel();
  const renderer = useThree((rootState) => rootState.gl);
  const camera = useThree((rootState) => rootState.camera);
  const rootScene = useThree((rootState) => rootState.scene);
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
  const healthAnchorRef = useRef<Group>(null);
  const healthPlateRef = useRef<HTMLDivElement>(null);
  const healthFillRef = useRef<HTMLDivElement>(null);
  const healthTextRef = useRef<HTMLSpanElement>(null);
  /** 마지막으로 화면에 쓴 체력. 값이 바뀔 때만 DOM 을 건드림. */
  const shownHealthKeyRef = useRef<string>("");
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

  /**
   * 체력판을 머리 위에 붙이고 값을 씀.
   *
   * 몸 노드를 따라가서 솟아오를 때 같이 올라옴. 리렌더 없이 DOM 을 직접 고침 —
   * 체력은 맞을 때마다 바뀌어 상태로 올리면 씬이 계속 다시 그려짐.
   */
  const applyHealthPlate = (emergence: number): void => {
    const anchor = healthAnchorRef.current;
    const plate = healthPlateRef.current;
    const bossHealth = getBossHealth();

    if (!anchor || !plate) {
      return;
    }

    // 쓰러진 뒤에는 내림. 누워 가라앉는 몸 위에 빈 체력판만 떠 있게 됨.
    const isShown = emergence > 0 && bossHealth !== null && bossHealth.health > 0;

    anchor.position.set(
      model.rig.position.x,
      model.rig.position.y + SPACE_BOSS.height + HEALTH_PLATE_LIFT,
      model.rig.position.z,
    );
    plate.style.visibility = isShown ? "visible" : "hidden";
    plate.style.opacity = String(emergence);

    if (!isShown || !bossHealth) {
      return;
    }

    const health = Math.ceil(bossHealth.health);
    const healthKey = `${health}/${bossHealth.maximumHealth}`;

    if (healthKey === shownHealthKeyRef.current) {
      return;
    }

    shownHealthKeyRef.current = healthKey;

    if (healthFillRef.current) {
      const ratio = Math.min(1, Math.max(0, bossHealth.health / bossHealth.maximumHealth));

      healthFillRef.current.style.width = `${ratio * 100}%`;
    }

    if (healthTextRef.current) {
      healthTextRef.current.textContent = `${health.toLocaleString()} / ${bossHealth.maximumHealth.toLocaleString()}`;
    }

    plate.setAttribute("aria-valuenow", String(health));
    plate.setAttribute("aria-valuemax", String(bossHealth.maximumHealth));
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

  /**
   * 보스와 바닥 예고의 셰이더를 미리 컴파일함.
   *
   * 숨겨 둔 메시는 처음 보이는 프레임에 컴파일됨. 그게 공격 종류마다 첫 예고가 뜨는
   * 순간이라 폰에서는 화면이 멈칫하고 예고가 늦게 보였음. 컴파일은 보이는 것만 훑어서
   * 잠깐 다 켜고 돌린 뒤 되돌림.
   */
  useEffect(() => {
    const targets = [model.scene, ...model.aoeRoots];
    const wasVisible = targets.map((target) => target.visible);

    for (const target of targets) {
      target.visible = true;
    }

    // 조명 수에 따라 셰이더가 달라져서 조명은 실제 씬에서 읽게 함.
    renderer.compileAsync(model.scene, camera, rootScene).catch(() => {
      // 못 해도 처음 보일 때 컴파일됨.
    });

    targets.forEach((target, index) => {
      target.visible = wasVisible[index];
    });
  }, [model, renderer, camera, rootScene]);

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

    const emergence = animator.update(bossState, performance.now(), deltaSeconds);

    applyShadow(emergence);
    applyHealthPlate(emergence);
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

      <group ref={healthAnchorRef}>
        <Html
          center
          distanceFactor={COMBAT_OVERLAY_DISTANCE_FACTOR}
          zIndexRange={[22, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            ref={healthPlateRef}
            role="progressbar"
            aria-label={`${BOSS_NAME} 체력`}
            aria-valuemin={0}
            className="flex w-44 select-none flex-col items-center gap-1"
            style={{ visibility: "hidden" }}
          >
            <span className="whitespace-nowrap text-xs font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
              {BOSS_NAME}
            </span>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/70 ring-1 ring-black/60">
              <div
                ref={healthFillRef}
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-[width] duration-300 ease-out"
                style={{ width: "100%" }}
              />
            </div>
            <span
              ref={healthTextRef}
              className="whitespace-nowrap text-[10px] font-semibold tabular-nums text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
            />
          </div>
        </Html>
      </group>
    </>
  );
}

const MemoizedRaidBoss = memo(RaidBoss);
MemoizedRaidBoss.displayName = "RaidBoss";

export default MemoizedRaidBoss;
