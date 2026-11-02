"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useMemo, useRef } from "react";
import type { DirectionalLight, PointLight } from "three";
import { type PlayerTransform, SPACE_ISLAND, SPACE_SCREEN_GLOW_POSITIONS } from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { LanternAnchor } from "@/views/space/lib/islandModel";

/**
 * 비트코인 아일랜드 조명 — 노을.
 *
 * 벙커는 천장이 닫힌 실내라 전역광을 낮추고 펜던트 몇 개로 밝기를 만들었다.
 * 섬은 하늘이 열려 있어 **태양 하나가 밝기의 대부분**을 담당하고, 랜턴은
 * 광장·계단의 분위기만 더한다.
 *
 * 맵이 노을 톤(분홍 하늘·황금 궁전)으로 구워져 있어 조명도 거기에 맞춘다.
 * 한낮의 흰 빛을 쓰면 버텍스컬러에 구워진 따뜻한 색과 싸워서 금장이 누렇게
 * 뜬다.
 */

/**
 * 파노라마가 도착하기 전까지 깔아 둘 단색.
 *
 * 그림의 수평선 부근 하늘색에서 뽑았다. 다른 색을 쓰면 파노라마가 붙는 순간
 * 하늘이 한 번 번쩍 바뀐다.
 */
export const SKY_FALLBACK_COLOR = "#b98aa0";
/**
 * 안개 색.
 *
 * 600 m 바다 평면이 끝나는 자리를 파노라마의 **수평선 바로 아래 물빛**으로
 * 녹인다. 색이 어긋나면 먼바다에 띠가 생겨 평면의 가장자리가 드러난다.
 */
const HORIZON_FOG_COLOR = "#706186";
const SKY_LIGHT_COLOR = "#ffd9c4";
/** 바다 반사광. 아래에서 올라오는 빛이라 푸른기를 남긴다. */
const WATER_BOUNCE_COLOR = "#54708f";
const SUN_COLOR = "#ffc08a";
const LANTERN_COLOR = "#ffb259";

/**
 * 안개 범위.
 *
 * 바다 평면이 600 m 라 끝이 화면에 잡히면 "판때기 위의 섬" 으로 보인다.
 * 섬 지름이 약 45 m, 무지개 다리 끝이 57 m 이므로 다리까지는 또렷하게 두고
 * 그 너머 바다를 하늘색으로 녹인다.
 */
const FOG_NEAR = 90;
const FOG_FAR = 320;

/** 물리 기반 조도라 점광원 강도는 칸델라 단위로 크게 잡아야 보인다. */
const LANTERN_INTENSITY = 90;
const LANTERN_DISTANCE = 16;
/**
 * 전광판이 바닥을 물들이는 세기.
 *
 * 벙커(180)에서 150 으로 내렸다가 다시 내렸다. 벙커는 전역광이 어두워서 그
 * 세기가 "패널이 빛난다" 로 읽혔는데, 섬은 태양이 밝아 같은 값이 광장 바닥을
 * **하얗게 태운다.** 패널 자체는 발광 재질이라 이 광원과 무관하게 밝으므로,
 * 바닥에 오렌지 기운만 남을 만큼으로 줄인다.
 */
const SCREEN_GLOW_INTENSITY = 45;
/** 도달 거리도 줄여 액자 앞에만 고이게 한다. 26 m 는 광장을 가로질렀다. */
const SCREEN_GLOW_DISTANCE = 14;

/**
 * 동시에 켜는 랜턴 수.
 *
 * 맵에는 랜턴 자리가 20곳 있는데 전부 켜면 포인트라이트 20개가 매 프래그먼트를
 * 돈다 — 모바일에서 그대로 프레임이 반토막 난다. **가까운 것만 켜고 따라
 * 옮긴다.** 광원 개수가 프레임마다 고정이라 셰이더가 다시 컴파일되지 않는다.
 */
const LANTERN_BUDGET = { desktop: 6, mobile: 3 } as const;

/**
 * 켤 랜턴을 다시 고르는 간격(초).
 *
 * 매 프레임 고르면 20개를 정렬하는 비용이 계속 든다. 걷는 속도가 4.5 m/s 라
 * 0.25 초면 1 m 남짓 움직이는데, 랜턴 간격이 그보다 훨씬 넓어 그 사이 순위가
 * 뒤집히는 일이 거의 없다.
 */
const LANTERN_REPICK_INTERVAL = 0.25;

/**
 * 태양 그림자 상자의 반폭(m).
 *
 * 섬 전체(80 m)를 한 상자로 덮으면 1024 맵에서 텍셀이 8 cm 라 아바타 그림자가
 * 뭉개진다. **플레이어를 따라다니는 작은 상자**로 바꿔 2.4 cm 로 줄였다.
 * 상자 밖은 그림자가 없지만, 그림자를 지는 것이 아바타뿐이라 눈에 띄지 않는다.
 */
const SUN_SHADOW_EXTENT = 26;
const SUN_SHADOW_MAP_SIZE = 2048;

/**
 * 주시점에서 본 태양 방향·거리. 낮게 깔린 노을이라 고도를 낮게 잡는다.
 *
 * **방위각이 `SkyBackground.SKY_ROTATION_Y` 와 짝이다.** 파노라마를 그 각도로
 * 돌려 그려진 해를 여기에 맞춰 두었으니, 이 값을 바꾸면 하늘의 해와 그림자가
 * 따로 논다.
 *
 * 그림의 해는 수평선에 걸려 있지만 광원 고도까지 0° 로 맞추지는 않는다.
 * 그러면 그림자가 끝없이 길어지고 블록 윗면에 빛이 전혀 안 들어 복셀이
 * 납작해 보인다. 방위만 맞추고 고도는 입체감이 사는 값으로 둔다.
 */
const SUN_OFFSET: readonly [number, number, number] = [-48, 40, 34];

interface SceneLightingProps {
  /** 모바일에서는 실시간 그림자 맵을 끈다. 아바타는 블롭 그림자로 대체한다. */
  hasRealtimeShadows: boolean;
  /** 랜턴 선택과 그림자 상자가 따라갈 기준. */
  playerStateRef: RefObject<PlayerTransform>;
  /** 맵에서 읽은 랜턴 자리. GLB 가 오기 전에는 비어 있다. */
  lanternAnchors: readonly LanternAnchor[];
}

function SceneLighting({
  hasRealtimeShadows,
  playerStateRef,
  lanternAnchors,
}: SceneLightingProps): ReactNode {
  // region [Hooks]
  const sunRef = useRef<DirectionalLight>(null);
  const lanternRefs = useRef<(PointLight | null)[]>([]);
  const repickCountdownRef = useRef<number>(0);
  const lanternCount = hasRealtimeShadows ? LANTERN_BUDGET.desktop : LANTERN_BUDGET.mobile;
  /** 슬롯은 개수만 고정이면 된다. 위치는 매번 가까운 랜턴으로 덮어쓴다. */
  const lanternSlots = useMemo(() => {
    return Array.from({ length: lanternCount }, (_, index) => index);
  }, [lanternCount]);
  // endregion

  // region [Privates]
  /**
   * 가까운 랜턴 자리로 광원을 옮긴다.
   *
   * 자리가 광원 수보다 적으면(GLB 도착 전) 남는 광원은 강도를 0 으로 둔다.
   * 끄는 대신 강도를 0 으로 두는 이유는 개수를 바꾸지 않기 위해서다.
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

  /**
   * 그림자 상자를 플레이어 위로 옮긴다.
   *
   * `target` 을 옮긴 뒤 행렬을 직접 갱신해야 한다 — 타깃은 씬 그래프에 붙지
   * 않은 기본 객체라 렌더러가 대신 갱신해 주지 않는다.
   */
  const followSun = (player: PlayerTransform): void => {
    const sun = sunRef.current;

    if (!sun) {
      return;
    }

    sun.position.set(player.x + SUN_OFFSET[0], player.y + SUN_OFFSET[1], player.z + SUN_OFFSET[2]);
    sun.target.position.set(player.x, player.y, player.z);
    sun.target.updateMatrixWorld();
  };
  // endregion

  // region [Life Cycles]
  useFrame((_, deltaSeconds) => {
    const player = playerStateRef.current;

    followSun(player);

    repickCountdownRef.current -= deltaSeconds;

    if (repickCountdownRef.current > 0) {
      return;
    }

    repickCountdownRef.current = LANTERN_REPICK_INTERVAL;
    repositionLanterns(player);
  });
  // endregion

  return (
    <>
      {/*
        하늘은 `SkyBackground` 가 파노라마로 덮는다. 여기서는 안개만 건다 —
        안개 색이 파노라마 수평선과 같아야 바다 평면의 끝이 보이지 않는다.
      */}
      <fog attach="fog" args={[HORIZON_FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      {/* 하늘과 바다에서 오는 전역광. 섬의 그늘진 면이 새까매지지 않게 받친다. */}
      <hemisphereLight color={SKY_LIGHT_COLOR} groundColor={WATER_BOUNCE_COLOR} intensity={0.8} />

      {/* 이 섬의 밝기는 사실상 전부 여기서 나온다. */}
      <directionalLight
        ref={sunRef}
        color={SUN_COLOR}
        intensity={1.7}
        castShadow={hasRealtimeShadows}
        shadow-mapSize-width={SUN_SHADOW_MAP_SIZE}
        shadow-mapSize-height={SUN_SHADOW_MAP_SIZE}
        shadow-camera-left={-SUN_SHADOW_EXTENT}
        shadow-camera-right={SUN_SHADOW_EXTENT}
        shadow-camera-top={SUN_SHADOW_EXTENT}
        shadow-camera-bottom={-SUN_SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0008}
      />

      {/* 가까운 랜턴만 켠다. 위치는 매 0.25 초 가까운 자리로 옮겨 간다. */}
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
          position={[0, SPACE_ISLAND.plazaY, 0]}
        />
      ))}

      {/* 두 전광판이 광장 바닥을 오렌지로 물들이게 하는 광원. */}
      {SPACE_SCREEN_GLOW_POSITIONS.map((glowPosition) => (
        <pointLight
          key={glowPosition[0]}
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
