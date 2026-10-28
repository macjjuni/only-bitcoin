"use client";

import { KIcon } from "kku-ui";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  BAKE_PADDING_IN_CSS_PX,
  bakeBitcoinIconCanvas,
  createDitherEffect,
  type DitherLight,
  type DitherPreset,
  type LogoEffectController,
} from "@/shared/lib/wordmark-canvas";

// region [Types]
export interface DitherLogoProps {
  /** 화면에 보이는 크기(CSS px). */
  sizeInCssPx: number;
  /**
   * 디더를 실제로 그리는 크기. 생략하면 `sizeInCssPx` 와 같음.
   * 작은 자리에서 점이 뭉개지면 크게 그리고 CSS `scale` 로 줄여 보여 줄 때 씀.
   */
  renderSizeInCssPx?: number;
  /** 켜진 점 색. */
  color?: string;
  /** 꺼진 점 색. null 이면 투명이라 어두운 쪽은 점으로만 남음. */
  offColor?: string | null;
  /** 광원 종류. `static` 은 고정 그라데이션이라 재생 관련 prop 이 의미 없음. */
  light?: DitherLight;
  /** 광원이 한 바퀴( sweep 은 한 번 ) 도는 주기(ms). */
  cycleInMs?: number;
  /** 프레임 간격(ms). 클수록 가벼움. */
  frameIntervalInMs?: number;
  /** 디더 점 하나 크기(그리는 크기 기준 CSS px). */
  cellSizeInCssPx?: number;
  /** 베이어 행렬 크기. 클수록 계조가 부드러움. */
  matrixSize?: DitherPreset["matrixSize"];
  /** 셀 안 로고가 이 비율 이상 차야 점을 찍음(0~1). */
  coverageThreshold?: number;
  /** false 면 현재 프레임에서 멈춤. */
  isPlaying?: boolean;
  /** 브라우저 탭이 안 보일 때 멈출지. */
  isPausedWhenHidden?: boolean;
  className?: string;
}
// endregion

// region [Constants]
/** Orbit Light 프리셋과 같은 기본값. */
const DEFAULT_COLOR = "#FFFFFF";
const DEFAULT_CYCLE_IN_MS = 6000;
const DEFAULT_FRAME_INTERVAL_IN_MS = 66;
const DEFAULT_CELL_SIZE_IN_CSS_PX = 2;
const DEFAULT_COVERAGE_THRESHOLD = 0.45;
// endregion

/**
 * 원형 비트코인 아이콘을 1-bit 베이어 디더로 그리는 공용 로고.
 *
 * 재생은 세 조건이 다 맞을 때만 돎: `isPlaying` · 화면 안에 보임 · 탭이 보임.
 * 셋 중 하나라도 빠지면 마지막 프레임에서 멈춤. 굽기 실패하면 기존 `KIcon` 으로 되돌림.
 */
const DitherLogo = ({
  sizeInCssPx,
  renderSizeInCssPx = sizeInCssPx,
  color = DEFAULT_COLOR,
  offColor = null,
  light = "orbit",
  cycleInMs = DEFAULT_CYCLE_IN_MS,
  frameIntervalInMs = DEFAULT_FRAME_INTERVAL_IN_MS,
  cellSizeInCssPx = DEFAULT_CELL_SIZE_IN_CSS_PX,
  matrixSize = 4,
  coverageThreshold = DEFAULT_COVERAGE_THRESHOLD,
  isPlaying = true,
  isPausedWhenHidden = true,
  className = "",
}: DitherLogoProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<LogoEffectController | null>(null);
  const isInViewportRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isPausedWhenHiddenRef = useRef(isPausedWhenHidden);
  const [isBakeFailed, setIsBakeFailed] = useState(false);

  /** prop 이 바뀔 때만 새로 만들어야 효과를 다시 안 구움. */
  const preset = useMemo<DitherPreset>(
    () => ({
      id: "dither-logo",
      name: "Dither Logo",
      description: "",
      light,
      cellSizeInCssPx,
      matrixSize,
      coverageThreshold,
      onColor: color,
      offColor,
      cycleInMs,
      frameIntervalInMs,
    }),
    [
      light,
      cellSizeInCssPx,
      matrixSize,
      coverageThreshold,
      color,
      offColor,
      cycleInMs,
      frameIntervalInMs,
    ],
  );
  // endregion

  // region [Privates]
  /** 재생 조건 셋을 보고 시작·정지를 맞춤. 컨트롤러가 중복 호출을 알아서 무시함. */
  const syncPlayback = () => {
    const controller = controllerRef.current;

    if (controller === null) {
      return;
    }

    const isPageVisible = !isPausedWhenHiddenRef.current || document.visibilityState === "visible";

    if (isPlayingRef.current && isInViewportRef.current && isPageVisible) {
      controller.start();
      return;
    }
    controller.stop();
  };
  // endregion

  // region [Life Cycles]
  /** 디더는 원본 알파만 읽으므로 굽는 색은 아무거나 상관없음. */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let isEffectCancelled = false;
    let intersectionObserver: IntersectionObserver | null = null;

    // 팩토리 타입이 Promise 도 허용해서 await 로 받음.
    const attachController = async () => {
      try {
        const bakedSource = bakeBitcoinIconCanvas(renderSizeInCssPx, "#FFFFFF");
        const createdController = await createDitherEffect({
          canvas,
          bakedSource,
          sourceKind: "icon",
          preset,
        });

        if (isEffectCancelled) {
          createdController.destroy();
          return;
        }
        controllerRef.current = createdController;

        intersectionObserver = new IntersectionObserver((entries) => {
          isInViewportRef.current = entries.some((entry) => entry.isIntersecting);
          syncPlayback();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        console.error("[DitherLogo] 로고 굽기 실패", bakeError);

        if (!isEffectCancelled) {
          setIsBakeFailed(true);
        }
      }
    };

    attachController();

    return () => {
      isEffectCancelled = true;
      intersectionObserver?.disconnect();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      isInViewportRef.current = false;
    };
  }, [preset, renderSizeInCssPx]);

  /** 재생 prop 은 효과를 다시 굽지 않고 시작·정지만 바꿈. */
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isPausedWhenHiddenRef.current = isPausedWhenHidden;
    syncPlayback();
  }, [isPlaying, isPausedWhenHidden]);

  useEffect(() => {
    const onVisibilityChangeDocument = () => {
      syncPlayback();
    };

    document.addEventListener("visibilitychange", onVisibilityChangeDocument);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChangeDocument);
    };
  }, []);
  // endregion

  // region [Templates]
  if (isBakeFailed) {
    return <KIcon icon="bitcoin" size={sizeInCssPx} className={className} />;
  }

  const displayScale = sizeInCssPx / renderSizeInCssPx;
  // endregion

  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ width: sizeInCssPx, height: sizeInCssPx }}
    >
      {/* 그리는 크기 기준으로 패딩까지 키운 뒤 좌상단 기준으로 줄임. 레이아웃은 바깥 박스 크기만 차지함. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute origin-top-left"
        style={{
          left: -BAKE_PADDING_IN_CSS_PX * displayScale,
          top: -BAKE_PADDING_IN_CSS_PX * displayScale,
          width: renderSizeInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          height: renderSizeInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          transform: `scale(${displayScale})`,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </span>
      <span className="sr-only">Bitcoin</span>
    </span>
  );
};

export default memo(DitherLogo);
