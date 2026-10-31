"use client";

import { useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { SPACE_TEXT_BANNER } from "@/entities/space";
import {
  type AdTextSlot,
  drawTextBanner,
  TEXT_BANNER_TEXTURE,
} from "@/views/space/lib/textBannerTexture";

interface TextAdBannerProps {
  slot: AdTextSlot;
}

// region [Privates]
const createBannerTexture = (slot: AdTextSlot): CanvasTexture => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = TEXT_BANNER_TEXTURE.width;
  canvasElement.height = TEXT_BANNER_TEXTURE.height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  const context = canvasElement.getContext("2d");

  if (context) {
    drawTextBanner(context, slot);
    texture.needsUpdate = true;
  }

  return texture;
};
// endregion

/**
 * 전광판 위 텍스트 전용 광고 배너.
 *
 * 문구가 바뀔 때만 다시 그린다. 시세처럼 매 프레임 바뀌는 값이 아니라
 * 프레임 루프에 둘 이유가 없다.
 */
function TextAdBanner({ slot }: TextAdBannerProps): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const bannerTexture = useMemo(() => createBannerTexture(slot), [slot]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // 패널보다 큰 텍스처라 항상 축소되어 그려진다. 기본 이방성(1)이면 뭉개진다.
    bannerTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    bannerTexture.needsUpdate = true;

    return () => {
      bannerTexture.dispose();
    };
  }, [bannerTexture, renderer]);
  // endregion

  return (
    <mesh position={SPACE_TEXT_BANNER.offset}>
      <planeGeometry args={[SPACE_TEXT_BANNER.width, SPACE_TEXT_BANNER.height]} />
      <meshBasicMaterial map={bannerTexture} toneMapped={false} />
    </mesh>
  );
}

const MemoizedTextAdBanner = memo(TextAdBanner);
MemoizedTextAdBanner.displayName = "TextAdBanner";

export default MemoizedTextAdBanner;
