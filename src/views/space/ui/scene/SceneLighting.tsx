"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useMemo, useRef } from "react";
import type { PointLight } from "three";
import { type PlayerTransform, SPACE_HALL, SPACE_SCREEN_GLOW_POSITIONS } from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { LanternAnchor } from "@/views/space/lib/hallModel";

/**
 * 비트코인 홀 조명.
 *
 * 맵은 라이트맵으로 구워져 실시간 광원을 받지 않음. 여기 광원은 전부 **아바타용**
 * 이고, 구운 카페 조명(따뜻한 램프 톤)에 아바타 색을 맞추는 일만 함.
 */

/** 맵 GLB 가 오기 전과 창 너머로 비치는 배경색. 홀 천장 톤에서 뽑았음. */
export const HALL_BACKGROUND_COLOR = "#120b07";

/** 맵 README 권장값. 위는 램프빛, 아래는 원목 바닥 반사. */
const HALL_SKY_LIGHT_COLOR = "#ffd6b0";
const HALL_GROUND_LIGHT_COLOR = "#5a3020";
const HALL_HEMISPHERE_INTENSITY = 1.2;
/** 정면에서 얼굴을 받쳐 주는 약한 주광. 그림자는 지지 않음(바닥이 못 받음). */
const KEY_LIGHT_COLOR = "#ffcf9e";
const KEY_LIGHT_INTENSITY = 0.6;
const KEY_LIGHT_POSITION: readonly [number, number, number] = [0, 18, -10];

const LANTERN_COLOR = "#ffb86b";
/** 물리 기반 조도라 칸델라 단위로 크게 잡아야 보임. */
const LANTERN_INTENSITY = 30;
const LANTERN_DISTANCE = 8;
/** 전광판이 앞에 선 아바타를 물들이는 세기. */
const SCREEN_GLOW_INTENSITY = 40;
const SCREEN_GLOW_DISTANCE = 12;

/**
 * 동시에 켜는 램프 수.
 *
 * 맵에 램프 자리가 35곳 있는데 전부 켜면 모바일 프레임이 반토막 남. 가까운
 * 것만 켜고 따라 옮김. 개수가 고정이라 셰이더가 다시 컴파일되지 않음.
 */
const LANTERN_BUDGET = { desktop: 6, mobile: 3 } as const;

/** 켤 램프를 다시 고르는 간격(초). */
const LANTERN_REPICK_INTERVAL = 0.25;

interface SceneLightingProps {
  /** 데스크톱 여부 판단에 씀. 모바일은 램프를 덜 켬. */
  hasRealtimeShadows: boolean;
  /** 램프 선택이 따라갈 기준. */
  playerStateRef: RefObject<PlayerTransform>;
  /** 맵에서 읽은 램프 자리. GLB 가 오기 전에는 비어 있다. */
  lanternAnchors: readonly LanternAnchor[];
}

function SceneLighting({
  hasRealtimeShadows,
  playerStateRef,
  lanternAnchors,
}: SceneLightingProps): ReactNode {
  // region [Hooks]
  const lanternRefs = useRef<(PointLight | null)[]>([]);
  const repickCountdownRef = useRef<number>(0);
  const lanternCount = hasRealtimeShadows ? LANTERN_BUDGET.desktop : LANTERN_BUDGET.mobile;
  /** 슬롯은 개수만 고정이면 된다. 위치는 매번 가까운 램프로 덮어쓴다. */
  const lanternSlots = useMemo(() => {
    return Array.from({ length: lanternCount }, (_, index) => index);
  }, [lanternCount]);
  // endregion

  // region [Privates]
  /**
   * 가까운 램프 자리로 광원을 옮긴다.
   *
   * 자리가 광원 수보다 적으면(GLB 도착 전) 남는 광원은 강도를 0 으로 둠. 개수를
   * 바꾸지 않으려고 끄는 대신 0 을 씀.
   */
  const repositionLanterns = (player: PlayerTransform): void => {
    const nearest = [...lanternAnchors]
      .sort((left, right) => {
        const leftDistance = (left[0] - player.x) ** 2 + (left[2] - player.z) ** 2;
        const rightDistance = (right[0] - player.x) ** 2 + (right[2] - player.z) ** 2;

        return leftDistance - rightDistance;
      })
      .slice(0, lanternCount);

    lanternRefs.current.forEach((light, index) => {
      if (!light) {
        return;
      }

      const anchor = nearest[index];

      light.intensity = anchor ? LANTERN_INTENSITY : 0;

      if (anchor) {
        light.position.set(anchor[0], anchor[1], anchor[2]);
      }
    });
  };
  // endregion

  // region [Life Cycles]
  useFrame((_, deltaSeconds) => {
    repickCountdownRef.current -= deltaSeconds;

    if (repickCountdownRef.current > 0) {
      return;
    }

    repickCountdownRef.current = LANTERN_REPICK_INTERVAL;
    repositionLanterns(playerStateRef.current);
  });
  // endregion

  return (
    <>
      <color attach="background" args={[HALL_BACKGROUND_COLOR]} />

      <hemisphereLight
        color={HALL_SKY_LIGHT_COLOR}
        groundColor={HALL_GROUND_LIGHT_COLOR}
        intensity={HALL_HEMISPHERE_INTENSITY}
      />

      <directionalLight
        color={KEY_LIGHT_COLOR}
        intensity={KEY_LIGHT_INTENSITY}
        position={KEY_LIGHT_POSITION}
      />

      {/* 가까운 램프만 켠다. 위치는 매 0.25 초 가까운 자리로 옮겨 간다. */}
      {lanternSlots.map((slotIndex) => (
        <pointLight
          key={slotIndex}
          ref={(light) => {
            lanternRefs.current[slotIndex] = light;
          }}
          color={LANTERN_COLOR}
          intensity={0}
          distance={LANTERN_DISTANCE}
          decay={2}
          position={[0, SPACE_HALL.floorY, 0]}
        />
      ))}

      {SPACE_SCREEN_GLOW_POSITIONS.map((glowPosition) => (
        <pointLight
          key={glowPosition.join(":")}
          color={BITCOIN_COLOR}
          intensity={SCREEN_GLOW_INTENSITY}
          distance={SCREEN_GLOW_DISTANCE}
          decay={2}
          position={glowPosition}
        />
      ))}
    </>
  );
}

const MemoizedSceneLighting = memo(SceneLighting);
MemoizedSceneLighting.displayName = "SceneLighting";

export default MemoizedSceneLighting;
