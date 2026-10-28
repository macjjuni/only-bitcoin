"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { HashStreamPreset } from "@/shared/lib/wordmark-canvas";
import {
  BAKE_PADDING_IN_CSS_PX,
  bakeWordmarkCanvas,
  createHashStreamController,
  type HashStreamController,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";

interface HashStreamWordmarkProps {
  preset: HashStreamPreset;
  widthInCssPx: number;
  heightInCssPx: number;
  fontId?: WordmarkFontId;
  className?: string;
}

const HashStreamWordmark = ({
  preset,
  widthInCssPx,
  heightInCssPx,
  fontId = "pretendard",
  className = "",
}: HashStreamWordmarkProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Life Cycles]
  /**
   * 워드마크를 굽고 스트림 컨트롤러를 붙인다.
   *
   * 스트림 문자는 보이는 캔버스에 `fillText` 로 직접 찍으므로, 굽기와 별개로 **문서 쪽**
   * 등폭 폰트 로드가 끝나 있어야 한다. 안 기다리면 첫 스트립이 폴백 폰트로 그려지고,
   * 그 스트립은 문자가 갈릴 때까지 그대로 남는다.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let isEffectCancelled = false;
    let controller: HashStreamController | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const attachController = async () => {
      try {
        const [bakedWordmark] = await Promise.all([
          bakeWordmarkCanvas({
            widthInCssPx,
            heightInCssPx,
            fillColor: preset.streamColor,
            fontId,
          }),
          document.fonts.load("700 16px 'JetBrains Mono'"),
        ]);

        if (isEffectCancelled) {
          return;
        }

        controller = createHashStreamController({ canvas, bakedWordmark, preset });

        intersectionObserver = new IntersectionObserver((entries) => {
          const isWordmarkVisible = entries.some((entry) => entry.isIntersecting);

          if (isWordmarkVisible) {
            controller?.start();
            return;
          }
          controller?.stop();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        console.error("[HashStreamWordmark] 워드마크 굽기 실패", bakeError);

        if (!isEffectCancelled) {
          setIsBakeFailed(true);
        }
      }
    };

    attachController();

    return () => {
      isEffectCancelled = true;
      intersectionObserver?.disconnect();
      controller?.destroy();
    };
  }, [preset, widthInCssPx, heightInCssPx, fontId]);
  // endregion

  // region [Templates]
  if (isBakeFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold ${className}`}
        style={{
          width: widthInCssPx,
          height: heightInCssPx,
          fontFamily: `'${WORDMARK_FONTS[fontId].familyName}', sans-serif`,
          fontSize: heightInCssPx * 0.8,
          color: preset.streamColor,
        }}
      >
        BITCOIN
      </span>
    );
  }
  // endregion

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: widthInCssPx, height: heightInCssPx }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: -BAKE_PADDING_IN_CSS_PX,
          top: -BAKE_PADDING_IN_CSS_PX,
          width: widthInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          height: heightInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </span>
      <span className="sr-only">BITCOIN</span>
    </span>
  );
};

export default memo(HashStreamWordmark);
