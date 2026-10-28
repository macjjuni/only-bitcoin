"use client";

import { KIcon } from "kku-ui";
import { memo, useEffect, useRef, useState } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import {
  BAKE_PADDING_IN_CSS_PX,
  bakeBitcoinIconCanvas,
  createGlitchLogoController,
  type GlitchLogoController,
  type GlitchPlaybackMode,
  type GlitchPreset,
} from "@/shared/lib/wordmark-canvas";

interface GlitchIconProps {
  preset: GlitchPreset;
  sizeInCssPx: number;
  /** 재생 모드. 기본은 서비스에 나갈 동작과 같은 `production`. */
  playbackMode?: GlitchPlaybackMode;
  /** 아이콘 본체 색. 기본은 비트코인 브랜드 오렌지. */
  fillColor?: string;
  className?: string;
}

/**
 * 원형 비트코인 아이콘에 `GlitchWordmark` 와 같은 글리치를 입힌 캔버스 아이콘.
 * 워드마크와 같은 엔진·프리셋을 써서 둘이 같이 튐. 굽기 실패하면 기존 `KIcon` 으로 되돌림.
 */
const GlitchIcon = ({
  preset,
  sizeInCssPx,
  playbackMode = "production",
  fillColor = BITCOIN_COLOR,
  className = "",
}: GlitchIconProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GlitchLogoController | null>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Events]
  /** 호버·탭하면 대기를 건너뛰고 바로 튐. 터치는 `pointerenter` 가 들쭉날쭉해서 `pointerdown` 도 받음. */
  const onPointerEnterIcon = () => {
    controllerRef.current?.triggerBurstNow();
  };

  const onPointerDownIcon = () => {
    controllerRef.current?.triggerBurstNow();
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let controller: GlitchLogoController | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    try {
      const bakedWordmark = bakeBitcoinIconCanvas(sizeInCssPx, fillColor);

      controller = createGlitchLogoController({ canvas, bakedWordmark, preset, playbackMode });
      controllerRef.current = controller;

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
      console.error("[GlitchIcon] 아이콘 굽기 실패", bakeError);
      setIsBakeFailed(true);
    }

    return () => {
      intersectionObserver?.disconnect();
      controller?.destroy();
      controllerRef.current = null;
    };
  }, [preset, sizeInCssPx, playbackMode, fillColor]);
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
      onPointerEnter={onPointerEnterIcon}
      onPointerDown={onPointerDownIcon}
    >
      {/* 채널 분리가 박스 밖으로 번지도록 캔버스만 사방 패딩만큼 키움. */}
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
      </span>
      <span className="sr-only">Bitcoin</span>
    </span>
  );
};

export default memo(GlitchIcon);
