"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { useOrderFlowStore, VENUE_IDS } from "@/entities/order-flow";
import { orderFlowController } from "@/entities/order-flow/client";
import { BattleEngine } from "../lib/battleEngine";
import { type CommanderSpriteAtlas, loadCommanderSpriteAtlas } from "../lib/commanderSpriteAtlas";
import { renderSpaceBattle } from "../lib/renderSpaceBattle";
import { loadShipSpriteAtlas, type ShipSpriteAtlas } from "../lib/shipSpriteAtlas";
import { StarField } from "../lib/starField";
import {
  ORDER_WALL_LEVEL_COUNT,
  type OrderWallSnapshot,
  type VenueBadgeInfo,
} from "../model/battleRenderTypes";
import {
  DENSITY_PROFILES,
  MOBILE_WIDTH_THRESHOLD_IN_PX,
  type WarControlState,
} from "../model/warViewModel";

/** 오더북 정렬 비용이 있어 매 프레임이 아니라 이 간격으로만 실드를 다시 만든다. */
const ORDER_WALL_REFRESH_INTERVAL_IN_MS = 200;

/** 체결을 프레임마다 쏟아내지 않고 이 간격으로 묶어 소비한다. */
const TRADE_BATCH_INTERVAL_IN_MS = 140;

/** 데스크톱 캔버스 해상도 배수 상한. */
const MAX_DEVICE_PIXEL_RATIO = 2;

/**
 * 모바일 해상도 배수 상한.
 *
 * 스프라이트는 도형보다 픽셀당 비용이 커서 데스크톱과 같은 배수를 쓰면 저사양 기기에서
 * 프레임이 흔들린다. 함선이 40px 안팎으로 그려지는 크기라 1.5 로 낮춰도 눈에 띄지 않는다.
 */
const MAX_MOBILE_DEVICE_PIXEL_RATIO = 1.5;

/** 활성 객체 수 보고 주기. */
const ACTIVE_OBJECT_REPORT_INTERVAL_IN_MS = 250;

interface SpaceBattleCanvasProps {
  controlState: WarControlState;
  /** 캔버스 활성 객체 수를 진단 패널로 올려 보낸다. */
  onChangeActiveObjectCount: (activeObjectCount: number) => void;
}

/**
 * 우주 전장 캔버스.
 *
 * 체결과 호가를 우주선 스프라이트로 그린다. 시뮬레이션은 `BattleEngine` 이 맡고 이
 * 컴포넌트는 커넥터에서 자료를 읽어 프레임 루프를 돌리는 일만 한다.
 *
 * 사이트 테마를 따르지 않고 항상 어둡게 그린다. 별과 성운을 밝은 배경에 올리면 우주로
 * 읽히지 않아서, 이 캔버스만 라이트 모드에서도 어두운 채로 둔다.
 */
export function SpaceBattleCanvas({
  controlState,
  onChangeActiveObjectCount,
}: SpaceBattleCanvasProps): ReactNode {
  //#region [Hooks]
  const canvasElementReference = useRef<HTMLCanvasElement>(null);
  const containerElementReference = useRef<HTMLDivElement>(null);
  const engineReference = useRef<BattleEngine>(new BattleEngine());
  const starFieldReference = useRef<StarField>(new StarField());
  const shipSpriteAtlasReference = useRef<ShipSpriteAtlas | null>(null);
  const commanderSpriteAtlasReference = useRef<CommanderSpriteAtlas | null>(null);
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
    const widthInPx = Math.max(1, Math.round(containerRectangle.width));
    const heightInPx = Math.max(1, Math.round(containerRectangle.height));
    const isMobileWidth = widthInPx <= MOBILE_WIDTH_THRESHOLD_IN_PX;
    const maxDevicePixelRatio = isMobileWidth
      ? MAX_MOBILE_DEVICE_PIXEL_RATIO
      : MAX_DEVICE_PIXEL_RATIO;
    const devicePixelRatio = Math.min(maxDevicePixelRatio, window.devicePixelRatio || 1);

    canvasElement.width = Math.round(widthInPx * devicePixelRatio);
    canvasElement.height = Math.round(heightInPx * devicePixelRatio);
    canvasElement.style.width = `${widthInPx}px`;
    canvasElement.style.height = `${heightInPx}px`;

    /**
     * 버퍼 크기를 바꾸면 컨텍스트 상태가 초기화되므로 변환과 스무딩을 여기서 다시 건다.
     *
     * 스프라이트를 줄여 그리는 화면이라 기본값 `low` 로는 축소면이 거칠다. 품질을 올리는
     * 비용은 스프라이트를 미리 줄여 구워 둔 지금 구조에서는 무시할 만하다.
     */
    const context = canvasElement.getContext("2d");

    if (context !== null) {
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }

    canvasSizeReference.current = { widthInPx, heightInPx };
    starFieldReference.current.resize(widthInPx, heightInPx);

    engineReference.current.applyBudget(controlStateReference.current.effectDensity, isMobileWidth);
  }, []);

  /** 현재 보기 모드의 거래소들에서 실드 자료를 만든다. */
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

  /** 전선 목표 위치를 통합 압력으로 정한다. */
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
        starFieldReference.current.update(
          engineReference.current.getFrontLineRatio(),
          isReducedMotionReference.current,
        );
      }

      renderSpaceBattle({
        context,
        widthInPx,
        heightInPx,
        engine: engineReference.current,
        starField: starFieldReference.current,
        shipSpriteAtlas: shipSpriteAtlasReference.current,
        commanderSpriteAtlas: commanderSpriteAtlasReference.current,
        orderWalls: orderWallsReference.current,
        venueBadges: buildVenueBadges(),
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

  //#region [Transactions]
  /** 스프라이트 아틀라스를 받아 둔다. 도착 전까지는 렌더러가 도형으로 대신 그린다. */
  const fetchShipSpriteAtlas = useCallback(async (): Promise<void> => {
    try {
      shipSpriteAtlasReference.current = await loadShipSpriteAtlas();
    } catch {
      shipSpriteAtlasReference.current = null;
    }
  }, []);

  const fetchCommanderSpriteAtlas = useCallback(async (): Promise<void> => {
    try {
      commanderSpriteAtlasReference.current = await loadCommanderSpriteAtlas();
    } catch {
      commanderSpriteAtlasReference.current = null;
    }
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
    fetchShipSpriteAtlas();
  }, [fetchShipSpriteAtlas]);

  useEffect(() => {
    fetchCommanderSpriteAtlas();
  }, [fetchCommanderSpriteAtlas]);

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
      className="relative h-[320px] w-[calc(100% + 2rem)] -mx-2 overflow-hidden bg-[#080a12] layout-max:h-[360px]"
    >
      {/* 같은 정보를 아래 텍스트 HUD 가 전부 제공하므로 캔버스는 요약 설명만 노출한다. */}
      <canvas
        ref={canvasElementReference}
        className="block h-full w-full"
        role="img"
        aria-label="매수와 매도 함대의 실시간 우주 전투 애니메이션. 같은 정보는 아래 상태 표에서 글자로 확인할 수 있습니다."
      />
    </div>
  );
}
