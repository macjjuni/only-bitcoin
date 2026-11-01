"use client";

import { memo, type ReactNode } from "react";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_LOUNGE,
} from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 지하 벙커 조명.
 *
 * 전에는 중성 키라이트(1.65)와 청록 보조광으로 관제실 톤을 만들었다. 청록은
 * "상황실" 색이고, 밝은 전역광은 공간을 야외처럼 평평하게 만든다. 전체 조도를
 * 내리고 **따뜻한 국소광**으로 바꿨다 — 아지트의 아늑함은 천장 높이보다 어두운
 * 바탕에 떨어지는 빛 몇 덩어리가 만든다.
 *
 * 천장이 닫혀 있어 위에서 들어오는 빛이 막힌다는 점도 같이 반영했다. 키라이트는
 * 입체감만 남길 정도로 낮추고, 실제 밝기는 펜던트 점광원이 담당한다.
 */
const SKY_LIGHT_COLOR = "#4a4138";
const GROUND_LIGHT_COLOR = "#0f0d0c";
const KEY_LIGHT_COLOR = "#ffd8b0";
const FILL_LIGHT_COLOR = "#8a6a4a";
const PENDANT_LIGHT_COLOR = "#ff9d4d";
/** 물리 기반 조도라 점광원 강도는 칸델라 단위로 크게 잡아야 보인다. */
const BILLBOARD_GLOW_INTENSITY = 180;
const BILLBOARD_GLOW_DISTANCE = 44;
const PENDANT_LIGHT_INTENSITY = 150;
/**
 * 펜던트 도달 거리.
 *
 * 20 m 로 뒀더니 앞쪽 모서리가 최근접 펜던트에서 19.6 m 라 빛이 거의 끊겼다.
 * 감쇠가 제곱이므로 경계에 걸치는 거리는 사실상 어둠이다. 모서리까지 13 m 안에
 * 들어오게 배치를 바꾸고(아래) 거리에도 여유를 뒀다.
 */
const PENDANT_LIGHT_DISTANCE = 28;
const SHADOW_MAP_SIZE = 1024;

/**
 * 천장 펜던트 위치.
 *
 * 처음에는 라운지와 좌우 작업 구역에 몰아 뒀는데, 네 모서리가 최근접 펜던트에서
 * 15~20 m 떨어져 아무것도 보이지 않았다. 어두운 코너는 분위기지만 **형체가
 * 안 보이는 것은 분위기가 아니다.**
 *
 * 방(40 × 29)을 2 × 2 로 나눠 네 등을 걸고 라운지(`SPACE_LOUNGE`)에 한 등을 더한다. 어느
 * 모서리든 최근접 펜던트가 13.3 m 안에 들어온다. 등 아래가 밝고 사이가 어두운
 * 명암 자체는 그대로 남는다.
 */
const PENDANT_POSITIONS: readonly [number, number, number][] = [
  [-11, 6.8, -9],
  [11, 6.8, -9],
  [-11, 6.8, 6],
  [11, 6.8, 6],
  [0, 6.8, SPACE_LOUNGE.centerZ],
];

interface SceneLightingProps {
  /** 모바일에서는 실시간 그림자 맵을 끈다. 아바타는 블롭 그림자로 대체한다. */
  hasRealtimeShadows: boolean;
}

function SceneLighting({ hasRealtimeShadows }: SceneLightingProps): ReactNode {
  return (
    <>
      {/* 벽과 천장이 시야를 덮으므로 배경은 틈새로만 보인다. 거의 검게 둔다. */}
      <color attach="background" args={["#08090b"]} />

      <hemisphereLight color={SKY_LIGHT_COLOR} groundColor={GROUND_LIGHT_COLOR} intensity={0.6} />

      <directionalLight
        color={KEY_LIGHT_COLOR}
        intensity={0.7}
        position={[12, 22, 10]}
        castShadow={hasRealtimeShadows}
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-left={SPACE_BOUNDS.minX}
        shadow-camera-right={SPACE_BOUNDS.maxX}
        shadow-camera-top={SPACE_BOUNDS.maxZ}
        shadow-camera-bottom={SPACE_BOUNDS.minZ}
        shadow-camera-near={1}
        shadow-camera-far={80}
      />

      {/* 보조광은 그림자를 만들지 않고 벽·캐릭터의 어두운 면만 드러낸다. */}
      <directionalLight color={FILL_LIGHT_COLOR} intensity={0.3} position={[-18, 10, -8]} />

      {/* 천장 펜던트. 이 방의 실제 밝기는 여기서 나온다. */}
      {PENDANT_POSITIONS.map((pendantPosition) => (
        <pointLight
          key={`${pendantPosition[0]}:${pendantPosition[2]}`}
          color={PENDANT_LIGHT_COLOR}
          intensity={PENDANT_LIGHT_INTENSITY}
          distance={PENDANT_LIGHT_DISTANCE}
          decay={2}
          position={pendantPosition}
        />
      ))}

      {/*
        두 패널이 바닥을 물들이게 하는 광원. 패널보다 낮고 살짝 앞에 둔다.
        같은 규격으로 나란히 걸린 두 판이므로 한쪽만 물들이지 않는다.
      */}
      {[SPACE_BILLBOARD.glowPosition, SPACE_BLOCK_DASHBOARD.glowPosition].map((glowPosition) => (
        <pointLight
          key={glowPosition[0]}
          color={BITCOIN_COLOR}
          intensity={BILLBOARD_GLOW_INTENSITY}
          distance={BILLBOARD_GLOW_DISTANCE}
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
