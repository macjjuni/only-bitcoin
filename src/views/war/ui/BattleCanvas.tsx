"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useOrderFlowStore, VENUE_IDS } from "@/entities/order-flow";
import { orderFlowController } from "@/entities/order-flow/client";
import useSettingStore from "@/shared/stores/settingStore";
import { BattleEngine } from "../lib/battleEngine";
import {
  ORDER_WALL_LEVEL_COUNT,
  type OrderWallSnapshot,
  renderBattle,
  type VenueBadgeInfo,
} from "../lib/renderBattle";
import {
  DENSITY_PROFILES,
  MOBILE_WIDTH_THRESHOLD_IN_PX,
  type WarControlState,
} from "../model/warViewModel";

/** 오더북 정렬 비용이 있어 매 프레임이 아니라 이 간격으로만 방어벽을 다시 만든다. */
const ORDER_WALL_REFRESH_INTERVAL_IN_MS = 200;

/** 체결을 프레임마다 쏟아내지 않고 이 간격으로 묶어 소비한다. */
const TRADE_BATCH_INTERVAL_IN_MS = 140;

/** 캔버스 해상도 배수 상한. 고DPI 기기에서 픽셀 수가 폭증하는 것을 막는다. */
const MAX_DEVICE_PIXEL_RATIO = 2;

/** 활성 객체 수 보고 주기. 프레임마다 올리면 진단 패널이 초당 60번 리렌더된다. */
const ACTIVE_OBJECT_REPORT_INTERVAL_IN_MS = 250;

interface BattleCanvasProps {
  controlState: WarControlState;
  /** 캔버스 활성 객체 수를 진단 패널로 올려 보낸다. */
  onChangeActiveObjectCount: (activeObjectCount: number) => void;
}

/**
 * 2D 전장 캔버스.
 *
 * 체결과 오더북을 React state 를 거치지 않고 커넥터에서 직접 읽어 그린다. 이 컴포넌트는
 * 조작 상태가 바뀔 때만 리렌더되고, 초당 수백 건의 시장 데이터는 `requestAnimationFrame`
 * 루프 안에서만 흐른다.
 */
export function BattleCanvas({
  controlState,
  onChangeActiveObjectCount,
}: BattleCanvasProps): ReactNode {
  //#region [Hooks]
  const theme = useSettingStore((state) => state.theme);
  const canvasElementReference = useRef<HTMLCanvasElement>(null);
  const containerElementReference = useRef<HTMLDivElement>(null);
  const engineReference = useRef<BattleEngine>(new BattleEngine());
  const animationFrameIDReference = useRef<number | null>(null);
  const lastFrameTimeInMsReference = useRef(0);
  const lastTradeBatchAtInMsReference = useRef(0);
  const lastOrderWallRefreshAtInMsReference = useRef(0);
  const lastActiveObjectReportAtInMsReference = useRef(0);
  const orderWallsReference = useRef<OrderWallSnapshot[]>([]);
  const canvasSizeReference = useRef({ widthInPx: 0, heightInPx: 0 });
  const isReducedMotionReference = useRef(false);
  /** 렌더 루프가 매 프레임 읽는 조작 상태. props 를 클로저에 가두지 않으려고 ref 로 둔다. */
  const controlStateReference = useRef(controlState);
  const isDarkThemeReference = useRef(theme === "dark");
  //#endregion

  //#region [Privates]
  /** 컨테이너 크기와 DPR 에 맞춰 캔버스 버퍼 크기를 다시 잡는다. */
  const resizeCanvas = useCallback((): void => {
    const canvasElement = canvasElementReference.current;
    const containerElement = containerElementReference.current;

    if (canvasElement === null || containerElement === null) {
      return;
    }

    const containerRectangle = containerElement.getBoundingClientRect();
    const devicePixelRatio = Math.min(MAX_DEVICE_PIXEL_RATIO, window.devicePixelRatio || 1);
    const widthInPx = Math.max(1, Math.round(containerRectangle.width));
    const heightInPx = Math.max(1, Math.round(containerRectangle.height));

    canvasElement.width = Math.round(widthInPx * devicePixelRatio);
    canvasElement.height = Math.round(heightInPx * devicePixelRatio);
    canvasElement.style.width = `${widthInPx}px`;
    canvasElement.style.height = `${heightInPx}px`;

    const context = canvasElement.getContext("2d");
    context?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    canvasSizeReference.current = { widthInPx, heightInPx };

    engineReference.current.applyBudget(
      controlStateReference.current.effectDensity,
      widthInPx <= MOBILE_WIDTH_THRESHOLD_IN_PX,
    );
  }, []);

  /** 현재 보기 모드의 거래소들에서 방어벽 자료를 만든다. */
  const refreshOrderWalls = useCallback((): void => {
    const snapshot = useOrderFlowStore.getState().snapshot;

    orderWallsReference.current = VENUE_IDS.flatMap((venue) => {
      const feed = orderFlowController.getFeed(venue);

      if (feed === null) {
        return [];
      }

      const { bids, asks } = feed.orderBook.getTopLevels(ORDER_WALL_LEVEL_COUNT);

      if (bids.length === 0 && asks.length === 0) {
        return [];
      }

      const maxSizeInBtc = [...bids, ...asks].reduce(
        (currentMaxSizeInBtc, level) => Math.max(currentMaxSizeInBtc, level.sizeInBtc),
        0,
      );

      return [
        {
          venue,
          bidLevels: bids,
          askLevels: asks,
          maxSizeInBtc,
          isWeakened: snapshot.venues[venue].status !== "live",
        },
      ];
    });
  }, []);

  /**
   * 전선 목표 위치를 통합 압력으로 정한다.
   *
   * `live` 인 거래소들의 `venuePressure` 평균이라, 한 곳이 끊겨도 나머지로 계속 계산된다.
   */
  const applyPressureToEngine = useCallback((): void => {
    const snapshot = useOrderFlowStore.getState().snapshot;

    engineReference.current.setPressure(snapshot.aggregatePressure);
  }, []);

  /** 쌓인 체결을 꺼내 전투 객체로 바꾼다. */
  const consumeTradeBatch = useCallback((): void => {
    const snapshot = useOrderFlowStore.getState().snapshot;
    const densityProfile = DENSITY_PROFILES[controlStateReference.current.effectDensity];
    const trades = orderFlowController.drainTrades(densityProfile.tradeDrainPerVenue);

    for (const trade of trades) {
      engineReference.current.spawnFromTrade(trade, {
        isWeakened: snapshot.venues[trade.venue].status !== "live",
        isReducedMotion: isReducedMotionReference.current,
      });
    }
  }, []);

  const buildVenueBadges = useCallback((): VenueBadgeInfo[] => {
    const snapshot = useOrderFlowStore.getState().snapshot;

    return VENUE_IDS.map((venue) => ({
      venue,
      status: snapshot.venues[venue].status,
      isIncludedInAggregate: snapshot.includedVenues.includes(venue),
    }));
  }, []);

  /** 한 프레임. 일시정지 중에도 화면은 유지하되 시간은 흐르지 않는다. */
  const renderFrame = useCallback(
    (frameTimeInMs: number): void => {
      animationFrameIDReference.current = window.requestAnimationFrame(renderFrame);

      const canvasElement = canvasElementReference.current;
      const context = canvasElement?.getContext("2d");
      const { widthInPx, heightInPx } = canvasSizeReference.current;

      if (!context || widthInPx === 0 || heightInPx === 0) {
        return;
      }

      const deltaInMs = frameTimeInMs - lastFrameTimeInMsReference.current;
      lastFrameTimeInMsReference.current = frameTimeInMs;

      if (!controlStateReference.current.isPaused) {
        if (
          frameTimeInMs - lastOrderWallRefreshAtInMsReference.current >=
          ORDER_WALL_REFRESH_INTERVAL_IN_MS
        ) {
          lastOrderWallRefreshAtInMsReference.current = frameTimeInMs;
          refreshOrderWalls();
          applyPressureToEngine();
        }

        if (frameTimeInMs - lastTradeBatchAtInMsReference.current >= TRADE_BATCH_INTERVAL_IN_MS) {
          lastTradeBatchAtInMsReference.current = frameTimeInMs;
          consumeTradeBatch();
        }

        engineReference.current.update(deltaInMs, isReducedMotionReference.current);
      }

      renderBattle({
        context,
        widthInPx,
        heightInPx,
        engine: engineReference.current,
        orderWalls: orderWallsReference.current,
        venueBadges: buildVenueBadges(),
        isDarkTheme: isDarkThemeReference.current,
        isReducedMotion: isReducedMotionReference.current,
      });

      // 진단 패널이 닫혀 있으면 아무도 안 보는 값이라 리렌더를 유발하지 않는다.
      if (
        controlStateReference.current.isDiagnosticsOpen &&
        frameTimeInMs - lastActiveObjectReportAtInMsReference.current >=
          ACTIVE_OBJECT_REPORT_INTERVAL_IN_MS
      ) {
        lastActiveObjectReportAtInMsReference.current = frameTimeInMs;
        onChangeActiveObjectCount(engineReference.current.getActiveObjectCount());
      }
    },
    [
      applyPressureToEngine,
      buildVenueBadges,
      consumeTradeBatch,
      onChangeActiveObjectCount,
      refreshOrderWalls,
    ],
  );

  /**
   * 탭이 백그라운드로 갔다 돌아왔을 때 처리.
   *
   * 그 사이 쌓인 체결을 몰아서 재생하면 실제 시장과 무관한 폭죽이 된다.
   * 큐를 비우고 시간 기준도 새로 잡아 현재 시점부터 이어 그린다.
   */
  const handleVisibilityChange = useCallback((): void => {
    if (document.visibilityState !== "visible") {
      return;
    }

    orderFlowController.discardPendingTrades();
    lastFrameTimeInMsReference.current = performance.now();
    lastTradeBatchAtInMsReference.current = performance.now();
  }, []);
  //#endregion

  //#region [Life Cycles]
  useEffect(() => {
    controlStateReference.current = controlState;
    engineReference.current.applyBudget(
      controlState.effectDensity,
      canvasSizeReference.current.widthInPx <= MOBILE_WIDTH_THRESHOLD_IN_PX,
    );
  }, [controlState]);

  useEffect(() => {
    isDarkThemeReference.current = theme === "dark";
  }, [theme]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    isReducedMotionReference.current = reducedMotionQuery.matches;

    const handleReducedMotionChange = (event: MediaQueryListEvent): void => {
      isReducedMotionReference.current = event.matches;
    };

    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    return () => {
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
    };
  }, []);

  useEffect(() => {
    const containerElement = containerElementReference.current;

    if (containerElement === null) {
      return;
    }

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeCanvas]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  useEffect(() => {
    const engine = engineReference.current;
    lastFrameTimeInMsReference.current = performance.now();
    animationFrameIDReference.current = window.requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameIDReference.current !== null) {
        window.cancelAnimationFrame(animationFrameIDReference.current);
        animationFrameIDReference.current = null;
      }

      engine.clear();
    };
  }, [renderFrame]);
  //#endregion

  return (
    <div
      ref={containerElementReference}
      className="relative h-[320px] w-[calc(100% + 2rem)] -mx-2 overflow-hidden bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 layout-max:h-[360px]"
    >
      {/* 같은 정보를 아래 텍스트 HUD 가 전부 제공하므로 캔버스는 요약 설명만 노출한다. */}
      <canvas
        ref={canvasElementReference}
        className="block h-full w-full"
        role="img"
        aria-label="매수와 매도 세력의 실시간 전투 애니메이션. 같은 정보는 아래 상태 표에서 글자로 확인할 수 있습니다."
      />
    </div>
  );
}
