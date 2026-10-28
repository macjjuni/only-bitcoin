"use client";

import { KIcon } from "kku-ui";
import { memo, useEffect, useRef, useState } from "react";
import {
  BAKE_PADDING_IN_CSS_PX,
  bakeBitcoinIconCanvas,
  bakeBitcoinIconGlyphCanvas,
  createHashStreamController,
  type HashStreamController,
  type HashStreamPreset,
} from "@/shared/lib/wordmark-canvas";

interface HashStreamIconProps {
  preset: HashStreamPreset;
  sizeInCssPx: number;
  /** 뚫린 `B` 자리를 칠할 색. 안 넘기면 뚫린 채로 둬서 배경이 비침. */
  glyphColor?: string;
  className?: string;
}

/**
 * 원형 비트코인 아이콘 안쪽으로 해시 문자가 흐르는 캔버스 아이콘.
 * 굽기 실패하면 기존 `KIcon` 으로 되돌림.
 */
const HashStreamIcon = ({
  preset,
  sizeInCssPx,
  glyphColor,
  className = "",
}: HashStreamIconProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glyphCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Life Cycles]
  /** 스트림 문자는 문서 폰트로 `fillText` 함. 폰트 로드 전에 그리면 첫 스트립이 폴백 폰트로 남음. */
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
        await document.fonts.load("700 16px 'JetBrains Mono'");

        if (isEffectCancelled) {
          return;
        }

        const bakedWordmark = bakeBitcoinIconCanvas(sizeInCssPx, preset.streamColor);

        controller = createHashStreamController({ canvas, bakedWordmark, preset });

        // 화면 밖이면 루프 정지.
        intersectionObserver = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            controller?.start();
            return;
          }
          controller?.stop();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        console.error("[HashStreamIcon] 아이콘 굽기 실패", bakeError);

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
  }, [preset, sizeInCssPx]);

  /** `B` 는 스트림과 따로 그림. 테마가 바뀌어도 스트림을 다시 안 돌리려고 분리했음. */
  useEffect(() => {
    const glyphCanvas = glyphCanvasRef.current;
    const glyphContext = glyphCanvas?.getContext("2d");

    if (glyphCanvas === null || glyphContext === null || glyphContext === undefined) {
      return;
    }

    if (glyphColor === undefined) {
      glyphContext.clearRect(0, 0, glyphCanvas.width, glyphCanvas.height);
      return;
    }

    const bakedGlyph = bakeBitcoinIconGlyphCanvas(sizeInCssPx, glyphColor);

    glyphCanvas.width = bakedGlyph.width;
    glyphCanvas.height = bakedGlyph.height;
    glyphContext.drawImage(bakedGlyph, 0, 0);
  }, [glyphColor, sizeInCssPx]);
  // endregion

  // region [Templates]
  if (isBakeFailed) {
    return <KIcon icon="bitcoin" size={sizeInCssPx} className={className} />;
  }
  // endregion

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ width: sizeInCssPx, height: sizeInCssPx }}
    >
      {/* 굽기 패딩만큼 캔버스를 사방으로 키움. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: -BAKE_PADDING_IN_CSS_PX,
          top: -BAKE_PADDING_IN_CSS_PX,
          width: sizeInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          height: sizeInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
        <canvas ref={glyphCanvasRef} className="absolute inset-0 block h-full w-full" />
      </span>
      <span className="sr-only">Bitcoin</span>
    </span>
  );
};

export default memo(HashStreamIcon);
