"use client";

import { memo, useEffect, useRef, useState } from "react";
import type {
  LogoEffectController,
  LogoEffectFactory,
  LogoSourceKind,
} from "@/shared/lib/wordmark-canvas";
import {
  BAKE_PADDING_IN_CSS_PX,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";
import { bakeLogoSource } from "../lib/bakeLogoSource";

interface LogoEffectCanvasProps<TPreset> {
  /** 모듈 스코프 팩토리만 넘길 것. 렌더마다 새로 만들면 매번 다시 구움. */
  effect: LogoEffectFactory<TPreset>;
  preset: TPreset;
  sourceKind: LogoSourceKind;
  widthInCssPx: number;
  heightInCssPx: number;
  fontId?: WordmarkFontId;
  /** 굽는 원본 색. 새 시안은 알파만 쓰므로 기본 흰색. */
  fillColor?: string;
  className?: string;
}

/** 스크린 리더용 이름. 캔버스는 못 읽음. */
const ACCESSIBLE_LABEL_BY_SOURCE_KIND: Record<LogoSourceKind, string> = {
  icon: "Bitcoin",
  wordmark: "BITCOIN",
};

/**
 * 아이콘·워드마크 공용 시안 캔버스.
 * 굽기 → 효과 붙이기 → 화면 안에서만 재생. 클릭하면 타임라인을 처음부터 다시 돌림.
 */
const LogoEffectCanvas = <TPreset,>({
  effect,
  preset,
  sourceKind,
  widthInCssPx,
  heightInCssPx,
  fontId = "pretendard",
  fillColor = "#FFFFFF",
  className = "",
}: LogoEffectCanvasProps<TPreset>) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LogoEffectController | null>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Events]
  const onPointerDownSample = () => {
    controllerRef.current?.trigger();
  };
  // endregion

  // region [Life Cycles]
  /** 굽기·효과 생성 모두 비동기라, 끝나기 전에 언마운트되면 결과를 바로 버림. */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let isEffectCancelled = false;
    let controller: LogoEffectController | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const attachController = async () => {
      try {
        const bakedSource = await bakeLogoSource({
          sourceKind,
          widthInCssPx,
          heightInCssPx,
          fillColor,
          fontId,
        });

        if (isEffectCancelled) {
          return;
        }

        const createdController = await effect({ canvas, bakedSource, sourceKind, preset });

        if (isEffectCancelled) {
          createdController.destroy();
          return;
        }

        controller = createdController;
        controllerRef.current = createdController;

        // 화면 밖에선 루프 정지. 시안이 수십 개라 다 돌리면 스크롤이 버벅임.
        intersectionObserver = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            controller?.start();
            return;
          }
          controller?.stop();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        console.error("[LogoEffectCanvas] 시안 생성 실패", bakeError);

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
      controllerRef.current = null;
    };
  }, [effect, preset, sourceKind, widthInCssPx, heightInCssPx, fontId, fillColor]);
  // endregion

  // region [Templates]
  if (isBakeFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold text-red-400 ${className}`}
        style={{
          width: widthInCssPx,
          height: heightInCssPx,
          fontFamily: `'${WORDMARK_FONTS[fontId].familyName}', sans-serif`,
          fontSize: Math.min(heightInCssPx * 0.8, 14),
        }}
      >
        {sourceKind === "icon" ? "₿" : "BITCOIN"}
      </span>
    );
  }
  // endregion

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ width: widthInCssPx, height: heightInCssPx }}
      onPointerDown={onPointerDownSample}
    >
      {/* 효과가 박스 밖으로 번지도록 캔버스만 사방 패딩만큼 키움. */}
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
      <span className="sr-only">{ACCESSIBLE_LABEL_BY_SOURCE_KIND[sourceKind]}</span>
    </span>
  );
};

export default memo(LogoEffectCanvas) as typeof LogoEffectCanvas;
