"use client";

import { memo, type ReactNode } from "react";
import { SPACE_BILLBOARD, SPACE_BOUNDS } from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";

/** 우주 정거장 톤. 차가운 환경광 위에 전광판의 오렌지 광원만 올린다. */
const AMBIENT_COLOR = "#48597a";
const KEY_LIGHT_COLOR = "#cdd6e8";
/** 물리 기반 조도라 점광원 강도는 칸델라 단위로 크게 잡아야 보인다. */
const BILLBOARD_GLOW_INTENSITY = 160;
const BILLBOARD_GLOW_DISTANCE = 44;
const SHADOW_MAP_SIZE = 1024;

interface SceneLightingProps {
  /** 모바일에서는 실시간 그림자 맵을 끈다. 아바타는 블롭 그림자로 대체한다. */
  hasRealtimeShadows: boolean;
}

function SceneLighting({ hasRealtimeShadows }: SceneLightingProps): ReactNode {
  const [billboardX, billboardY, billboardZ] = SPACE_BILLBOARD.position;

  return (
    <>
      <ambientLight color={AMBIENT_COLOR} intensity={0.55} />

      <directionalLight
        color={KEY_LIGHT_COLOR}
        intensity={1.1}
        position={[14, 20, 12]}
        castShadow={hasRealtimeShadows}
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-left={SPACE_BOUNDS.minX}
        shadow-camera-right={SPACE_BOUNDS.maxX}
        shadow-camera-top={SPACE_BOUNDS.maxZ}
        shadow-camera-bottom={SPACE_BOUNDS.minZ}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />

      {/* 전광판이 바닥을 물들이게 하는 광원. 패널보다 살짝 앞에 둔다. */}
      <pointLight
        color={BITCOIN_COLOR}
        intensity={BILLBOARD_GLOW_INTENSITY}
        distance={BILLBOARD_GLOW_DISTANCE}
        decay={2}
        position={[billboardX, billboardY, billboardZ + 2.5]}
      />
    </>
  );
}

const MemoizedSceneLighting = memo(SceneLighting);
MemoizedSceneLighting.displayName = "SceneLighting";

export default MemoizedSceneLighting;
