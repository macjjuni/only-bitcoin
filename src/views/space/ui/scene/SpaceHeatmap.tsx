"use client";

import { useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useCoinMarketQuery } from "@/entities/coin-market/client";
import { SPACE_HEATMAP_FRAME } from "@/entities/space";
import { drawHeatmap, HEATMAP_TEXTURE } from "../../lib/heatmapTexture";
import { loadScreenFonts } from "../../lib/screenCanvas";
import { resolveScreenMaterialCacheKey, sharpenScreenMapSampling } from "../../lib/screenMaterial";

// region [Privates]
const createHeatmapSurface = () => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = HEATMAP_TEXTURE.width;
  canvasElement.height = HEATMAP_TEXTURE.height;
  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;
  return { texture, context: canvasElement.getContext("2d") };
};
// endregion

/** 벽난로 전광판. 히트맵 페이지와 같은 데이터를 2:1 캔버스에 배치함. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceHeatmap(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const surface = useMemo(createHeatmapSurface, []);
  const { data: snapshot, isError } = useCoinMarketQuery();
  // endregion


  // region [Privates]
  const redrawHeatmap = (): void => {
    if (!surface.context) {
      return;
    }
    drawHeatmap(surface.context, { snapshot, hasError: isError });
    surface.texture.needsUpdate = true;
  };

  const prepareTexture = (): (() => void) => {
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return () => surface.texture.dispose();
  };

  const refreshTexture = (): (() => void) => {
    let isActive = true;
    redrawHeatmap();
    loadScreenFonts().then((hasLoaded) => {
      if (isActive && hasLoaded) {
        redrawHeatmap();
      }
    });
    return () => { isActive = false; };
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => prepareTexture(), [surface, renderer]);
  useEffect(() => refreshTexture(), [surface, snapshot, isError]);
  // endregion

  return (
    <mesh
      position={SPACE_HEATMAP_FRAME.position}
      rotation={[0, SPACE_HEATMAP_FRAME.rotationY, 0]}
    >
      <planeGeometry args={[SPACE_HEATMAP_FRAME.width, SPACE_HEATMAP_FRAME.height]} />
      <meshBasicMaterial
        map={surface.texture}
        toneMapped={false}
        onBeforeCompile={sharpenScreenMapSampling}
        customProgramCacheKey={resolveScreenMaterialCacheKey}
      />
    </mesh>
  );
}

export default memo(SpaceHeatmap);
