"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { type AnimationAction, AnimationMixer } from "three";
import { SPACE_AVATAR } from "@/entities/space";
import { SPACE_BARISTA } from "@/views/space/lib/barista";
import { useBaristaModel } from "@/views/space/lib/baristaModel";
import { resolveNameplateDistanceFactor } from "@/views/space/lib/overlayLayout";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 배율을 곱한 키(m). */
const BARISTA_HEIGHT = SPACE_BARISTA.modelHeight * SPACE_BARISTA.modelScale;
/** 이름표를 정수리에서 띄우는 높이(m). 유저 명찰이 정수리 위로 뜨는 만큼과 같음. */
const NAMEPLATE_LIFT_ABOVE_HEAD = 0.26;
/** 모델은 앞이 +Z 임. 이 프로젝트는 전방이 −Z 라 반 바퀴 돌려 세움. */
const MODEL_FORWARD_YAW_OFFSET = Math.PI;
/**
 * 손짓을 몇 바퀴에 한 번 할지. 3 이면 18초에 한 번이고 나머지는 숨만 쉼.
 *
 * 에셋 모션은 6초마다 손을 들어서, 그대로 되풀이하면 쉴 새 없이 손짓하는 것처럼 보였음.
 */
const GESTURE_EVERY_LOOPS = 3;
/** 접지 그림자 지름(m). 유저 아바타와 같은 크기. */
const SHADOW_DIAMETER = SPACE_AVATAR.shadowRadius * SPACE_BARISTA.modelScale * 2;
/** 바닥과 겹쳐 지글거리지 않게 살짝 띄움(m). */
const SHADOW_LIFT_Y = 0.02;

interface SpaceBaristaProps {
  /** 이름표 크기를 유저 명찰과 맞추는 데 씀. */
  isCoarsePointer: boolean;
}

/**
 * 커피 바에 서 있는 바리스타 NPC.
 *
 * 전용 모델(`barista-skirt.glb`)을 세워 두고 대기 모션을 반복함. 손짓은 몇 바퀴에 한 번만 함. 모델을 받는 동안
 * 서스펜드하므로 부르는 쪽이 `Suspense` 로 감싸야 함. 말 걸기와 메뉴는 HUD(`SpaceBaristaMenu`)가 맡음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceBarista({ isCoarsePointer }: SpaceBaristaProps): ReactNode {
  // region [Hooks]
  const model = useBaristaModel();
  /**
   * 모션 재생기. **effect 에서 만들고 effect 에서 버림.**
   *
   * `useMemo` 로 만들면 개발 모드(StrictMode)가 정리 함수를 한 번 미리 돌릴 때 해제된
   * 재생기를 계속 쓰게 됨(`RaidBoss` 와 같은 이유).
   */
  const mixerRef = useRef<AnimationMixer | null>(null);
  const gestureActionRef = useRef<AnimationAction | null>(null);
  const restActionRef = useRef<AnimationAction | null>(null);
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const [isNameReady, setIsNameReady] = useState<boolean>(false);
  // endregion


  // region [Privates]
  /**
   * 이번 바퀴에 손짓할지 정해 두 모션의 세기를 바꿈.
   *
   * 둘은 같이 시작해 같은 박자로 돌고, 한쪽만 세기를 1 로 둠. 바퀴가 넘어가는 순간에는
   * 둘 다 첫 자세라 바꿔도 안 튐.
   */
  const applyGestureCycle = (mixer: AnimationMixer): void => {
    const loopIndex = Math.floor(mixer.time / model.idleClip.duration);
    const isGestureLoop = loopIndex % GESTURE_EVERY_LOOPS === 0;

    gestureActionRef.current?.setEffectiveWeight(isGestureLoop ? 1 : 0);
    restActionRef.current?.setEffectiveWeight(isGestureLoop ? 0 : 1);
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const mixer = new AnimationMixer(model.scene);

    gestureActionRef.current = mixer.clipAction(model.idleClip).play();
    restActionRef.current = mixer.clipAction(model.restClip).play();
    mixerRef.current = mixer;

    return () => {
      mixerRef.current = null;
      gestureActionRef.current = null;
      restActionRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(model.scene);
    };
  }, [model]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
    };
  }, [shadowTexture]);

  useFrame((_, deltaSeconds) => {
    const mixer = mixerRef.current;

    if (mixer) {
      applyGestureCycle(mixer);
      mixer.update(deltaSeconds);
    }

    // 첫 렌더에 같이 붙은 `<Html>` 은 씬이 서스펜드했다 돌아올 때 렌더 도중에 루트를 내리려다
    // 경고를 냄. 유저 명찰(`Nameplates`)처럼 첫 프레임이 돈 뒤에 붙임.
    if (!isNameReady) {
      setIsNameReady(true);
    }
  });
  // endregion

  return (
    <group position={[SPACE_BARISTA.x, SPACE_BARISTA.y, SPACE_BARISTA.z]}>
      <group
        rotation={[0, SPACE_BARISTA.yaw + MODEL_FORWARD_YAW_OFFSET, 0]}
        scale={SPACE_BARISTA.modelScale}
      >
        {/* `dispose={null}` 로 로더 캐시의 지오메트리·머티리얼이 언마운트에서 해제되지 않게 막음. */}
        <primitive object={model.scene} dispose={null} />
      </group>

      {/* 바닥이 라이트맵 언릿이라 실시간 그림자를 못 받음. 아바타처럼 블롭 그림자를 깖. */}
      <mesh position={[0, SHADOW_LIFT_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SHADOW_DIAMETER, SHADOW_DIAMETER]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>

      {isNameReady && (
        <group position={[0, BARISTA_HEIGHT + NAMEPLATE_LIFT_ABOVE_HEAD, 0]}>
          <Html
            center
            distanceFactor={resolveNameplateDistanceFactor(isCoarsePointer)}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            {/* 유저 명찰과 같은 모양에 글자색만 달리해 NPC 임을 알림. */}
            <span className="flex h-5 w-max select-none items-center whitespace-nowrap rounded-full bg-black/65 px-2 text-[11px] font-medium leading-none text-amber-200 backdrop-blur-sm">
              {SPACE_BARISTA.name}
            </span>
          </Html>
        </group>
      )}
    </group>
  );
}

const MemoizedSpaceBarista = memo(SpaceBarista);
MemoizedSpaceBarista.displayName = "SpaceBarista";

export default MemoizedSpaceBarista;
