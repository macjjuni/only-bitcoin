"use client";

import { memo, type ReactNode } from "react";
import { SPACE_BILLBOARD, SPACE_BOUNDS } from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";

/** 밝은 천장과 어두운 바닥의 색을 나눠 금속 패널과 아바타의 입체감을 만든다. */
const SKY_LIGHT_COLOR = "#b7cfdf";
const GROUND_LIGHT_COLOR = "#172333";
const KEY_LIGHT_COLOR = "#e7f0f5";
const FILL_LIGHT_COLOR = "#75a9bd";
/** 물리 기반 조도라 점광원 강도는 칸델라 단위로 크게 잡아야 보인다. */
const BILLBOARD_GLOW_INTENSITY = 180;
const BILLBOARD_GLOW_DISTANCE = 44;
const SHADOW_MAP_SIZE = 1024;

interface SceneLightingProps {
  /** 모바일에서는 실시간 그림자 맵을 끈다. 아바타는 블롭 그림자로 대체한다. */
  hasRealtimeShadows: boolean;
}

function SceneLighting({ hasRealtimeShadows }: SceneLightingProps): ReactNode {
  return (
    <>
      <color attach="background" args={["#0b121c"]} />

      <hemisphereLight color={SKY_LIGHT_COLOR} groundColor={GROUND_LIGHT_COLOR} intensity={1.05} />

      <directionalLight
        color={KEY_LIGHT_COLOR}
        intensity={1.65}
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

      {/* 청록 보조광은 그림자를 만들지 않고 벽·캐릭터의 어두운 면만 드러낸다. */}
      <directionalLight color={FILL_LIGHT_COLOR} intensity={0.35} position={[-18, 10, -8]} />

      {/* 전광판이 바닥을 물들이게 하는 광원. 패널보다 낮고 살짝 앞에 둔다. */}
      <pointLight
        color={BITCOIN_COLOR}
        intensity={BILLBOARD_GLOW_INTENSITY}
        distance={BILLBOARD_GLOW_DISTANCE}
        decay={2}
        position={SPACE_BILLBOARD.glowPosition}
      />
    </>
  );
}

const MemoizedSceneLighting = memo(SceneLighting);
MemoizedSceneLighting.displayName = "SceneLighting";

export default MemoizedSceneLighting;
