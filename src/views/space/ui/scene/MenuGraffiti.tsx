"use client";

import { useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { SPACE_MENU_FRAME } from "@/entities/space";
import { drawMenuGraffiti, MENU_GRAFFITI_TEXTURE } from "@/views/space/lib/menuGraffitiTexture";
import {
  resolveScreenMaterialCacheKey,
  sharpenScreenMapSampling,
} from "@/views/space/lib/screenMaterial";

// region [Privates]
const createGraffitiTexture = (): CanvasTexture => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = MENU_GRAFFITI_TEXTURE.width;
  canvasElement.height = MENU_GRAFFITI_TEXTURE.height;

  const context = canvasElement.getContext("2d");
  if (context) {
    drawMenuGraffiti(context);
  }

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  return texture;
};
// endregion

/**
 * 커피 바 메뉴판 자리의 분필 낙서판.
 *
 * 글자가 바뀌지 않아서 처음 한 번만 그리고 다시 올리지 않음. 위치·방향은
 * 호출부(`SpaceScene`)가 메뉴판 앵커에 맞춰 줌.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function MenuGraffiti(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const texture = useMemo(() => createGraffitiTexture(), []);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    // 바 앞에서 비스듬히 올려다보는 일이 많아 이방성 필터를 최대로 둠.
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;

    return () => {
      texture.dispose();
    };
  }, [texture, renderer]);
  // endregion

  return (
    <mesh>
      <planeGeometry args={[SPACE_MENU_FRAME.width, SPACE_MENU_FRAME.height]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        onBeforeCompile={sharpenScreenMapSampling}
        customProgramCacheKey={resolveScreenMaterialCacheKey}
      />
    </mesh>
  );
}

const MemoizedMenuGraffiti = memo(MenuGraffiti);
MemoizedMenuGraffiti.displayName = "MenuGraffiti";

export default MemoizedMenuGraffiti;
