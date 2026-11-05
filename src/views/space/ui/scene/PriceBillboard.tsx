"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { type BtcCandle, useBitcoinStore } from "@/entities/bitcoin";
import { useBtcLiveCandles } from "@/entities/bitcoin/client";
import { SPACE_BILLBOARD } from "@/entities/space";
import { usePrefersReducedMotion } from "@/features/space-controls";
import useSettingStore from "@/shared/stores/settingStore";
import {
  BILLBOARD_PRICE_MOTION,
  createBillboardPriceMotion,
  isBillboardPriceMotionActive,
  readBillboardPriceMotion,
  updateBillboardPriceMotion,
} from "@/views/space/lib/billboardPriceMotion";
import {
  BILLBOARD_CHART_REGION,
  BILLBOARD_PRICE_REGIONS,
  BILLBOARD_TEXTURE,
  type BillboardChartEndpoint,
  type BillboardPriceRegion,
  type BillboardState,
  drawBillboard,
  drawBillboardChart,
  drawBillboardPrice,
  formatBillboardChange,
  formatBillboardKrw,
  formatBillboardUsd,
  resolveBillboardChartEndpoint,
  resolveBillboardOnlineStatus,
  resolveChangeTone,
} from "@/views/space/lib/billboardTexture";
import { loadScreenFonts } from "@/views/space/lib/screenCanvas";
import {
  resolveScreenMaterialCacheKey,
  sharpenScreenMapSampling,
} from "@/views/space/lib/screenMaterial";
import BillboardChartPulse from "./BillboardChartPulse";
import BillboardOnlinePulse from "./BillboardOnlinePulse";

interface BillboardSurface {
  canvasElement: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  texture: CanvasTexture;
}

// region [Privates]
const createBillboardSurface = (
  width: number = BILLBOARD_TEXTURE.width,
  height: number = BILLBOARD_TEXTURE.height,
): BillboardSurface => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = width;
  canvasElement.height = height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  return { canvasElement, context: canvasElement.getContext("2d"), texture };
};

const createPriceSurface = (region: BillboardPriceRegion): BillboardSurface => {
  const surface = createBillboardSurface(region.width, region.height);
  surface.texture.generateMipmaps = false;
  surface.texture.minFilter = LinearFilter;
  surface.texture.magFilter = LinearFilter;

  return surface;
};

/**
 * 차트 텍스처를 다시 그리는 최소 간격(ms).
 *
 * 캔들 소켓은 2초마다 오고 등락률 톤은 시세마다 바뀔 수 있음. 초당 2번이면
 * 눈에는 실시간이고 차트 칸(1472 × 600) 재업로드도 가벼움.
 */
const CHART_MIN_REDRAW_INTERVAL_MS = 500;

/** 캔버스는 왼쪽 위, 3D 패널은 중앙이 원점이므로 Y축을 뒤집어 칸 위치를 맞춘다. */
const resolveRegionPlacement = (region: BillboardPriceRegion, z: number) => ({
  width: (region.width / BILLBOARD_TEXTURE.width) * SPACE_BILLBOARD.width,
  height: (region.height / BILLBOARD_TEXTURE.height) * SPACE_BILLBOARD.height,
  position: [
    ((region.x + region.width / 2) / BILLBOARD_TEXTURE.width - 0.5) * SPACE_BILLBOARD.width,
    (0.5 - (region.y + region.height / 2) / BILLBOARD_TEXTURE.height) * SPACE_BILLBOARD.height,
    z,
  ] as [number, number, number],
});

const PRICE_PLACEMENTS = {
  krw: resolveRegionPlacement(BILLBOARD_PRICE_REGIONS.krw, 0.002),
  usd: resolveRegionPlacement(BILLBOARD_PRICE_REGIONS.usd, 0.002),
};

/** 차트는 가격 칸과 겹치지 않지만 배경보다는 앞에 둠. */
const CHART_PLACEMENT = resolveRegionPlacement(BILLBOARD_CHART_REGION, 0.001);

/**
 * 큰 텍스처 변경 감지용 서명.
 *
 * 차트는 별도 텍스처라 여기서 빠짐. 등락률은 화면 글자(소수 한 자리)로 비교함.
 * 원본은 둘째 자리라 시세마다 바뀌어서, 그대로 비교하면 안 보이는 변화로 큰
 * 텍스처를 초당 4번까지 다시 올렸음.
 */
const createStateSignature = (state: BillboardState): string => {
  return [
    Number.isFinite(state.krw) && state.krw > 0,
    Number.isFinite(state.usd) && state.usd > 0,
    formatBillboardChange(state.krwChange24h),
    formatBillboardChange(state.usdChange24h),
    state.isKrwConnected,
    state.isUsdConnected,
  ].join("|");
};

const readBillboardState = (candles: readonly BtcCandle[]): BillboardState => {
  const { bitcoinPrice } = useBitcoinStore.getState();

  return {
    krw: bitcoinPrice.krw,
    usd: bitcoinPrice.usd,
    krwChange24h: bitcoinPrice.krwChange24h,
    usdChange24h: bitcoinPrice.usdChange24h,
    isKrwConnected: bitcoinPrice.isKrwConnected ?? false,
    isUsdConnected: bitcoinPrice.isUsdConnected ?? false,
    candles,
  };
};

// endregion

/**
 * 메인 전광판 왼쪽 칸, 비트코인 시세판.
 *
 * 시세는 최대 4 Hz 로 채택하고 가격은 250ms 동안 보간한다. 큰 베이스 텍스처는
 * 상태가 바뀔 때만 갱신하고 숫자 두 칸만 작은 텍스처로 최대 30 Hz 로 그린다.
 * 차트는 캔들 소켓이 2초마다 키우는 마지막 봉을 따라 별도 텍스처로 최대 2 Hz 로 그림.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function PriceBillboard(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const surface = useMemo(() => createBillboardSurface(), []);
  const priceSurfaces = useMemo(
    () => ({
      krw: createPriceSurface(BILLBOARD_PRICE_REGIONS.krw),
      usd: createPriceSurface(BILLBOARD_PRICE_REGIONS.usd),
    }),
    [],
  );
  const chartSurface = useMemo(
    () => createBillboardSurface(BILLBOARD_CHART_REGION.width, BILLBOARD_CHART_REGION.height),
    [],
  );
  const { candlesRef, versionRef: candlesVersionRef } = useBtcLiveCandles();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCountUp = useSettingStore((state) => state.setting.isCountUp);
  const lastSampledAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const lastPricesDrawnAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const lastSignatureRef = useRef<string>("");
  const priceMotionsRef = useRef({
    krw: createBillboardPriceMotion(0),
    usd: createBillboardPriceMotion(0),
  });
  const lastPriceTextsRef = useRef({ krw: "", usd: "" });
  const shouldSnapNextSampleRef = useRef<boolean>(true);
  const needsPriceRedrawRef = useRef<boolean>(true);
  const chartEndpointRef = useRef<BillboardChartEndpoint | null>(null);
  const isOnlineRef = useRef<boolean>(false);
  /** 마지막으로 그린 차트의 캔들 버전과 등락률 글자. 둘 다 같으면 다시 안 그림. */
  const lastChartKeyRef = useRef<string>("");
  const lastChartDrawnAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  // endregion


  // region [Privates]
  const redrawBillboard = (state: BillboardState): void => {
    if (!surface.context) {
      return;
    }

    drawBillboard(surface.context, state, { shouldDrawPrices: false, shouldDrawChart: false });
    surface.texture.needsUpdate = true;
  };

  const redrawPrices = (nowMs: number): void => {
    const priceTexts = {
      krw: formatBillboardKrw(readBillboardPriceMotion(priceMotionsRef.current.krw, nowMs)),
      usd: formatBillboardUsd(readBillboardPriceMotion(priceMotionsRef.current.usd, nowMs)),
    };
    const { krwChange24h, usdChange24h } = useBitcoinStore.getState().bitcoinPrice;
    const priceTones = {
      krw: resolveChangeTone(krwChange24h),
      usd: resolveChangeTone(usdChange24h),
    };

    for (const currency of ["krw", "usd"] as const) {
      const priceSurface = priceSurfaces[currency];
      // 숫자가 그대로여도 등락 방향이 바뀌면 글자 색이 바뀌므로 둘을 묶어 비교함.
      const priceKey = `${priceTexts[currency]}|${priceTones[currency]}`;

      if (!priceSurface.context || priceKey === lastPriceTextsRef.current[currency]) {
        continue;
      }

      drawBillboardPrice(
        priceSurface.context,
        priceTexts[currency],
        currency,
        priceTones[currency],
      );
      priceSurface.texture.needsUpdate = true;
      lastPriceTextsRef.current[currency] = priceKey;
    }
  };

  /** 캔들이나 차트 색(24시간 방향)이 바뀌었을 때만, 최대 2 Hz 로 차트 칸을 다시 그림. */
  const redrawChartIfChanged = (nowMs: number, isForced: boolean): void => {
    if (!chartSurface.context) {
      return;
    }

    const { usdChange24h } = useBitcoinStore.getState().bitcoinPrice;
    const chartKey = `${candlesVersionRef.current}|${formatBillboardChange(usdChange24h)}`;
    const isThrottled = nowMs - lastChartDrawnAtRef.current < CHART_MIN_REDRAW_INTERVAL_MS;

    if (chartKey === lastChartKeyRef.current || (isThrottled && !isForced)) {
      return;
    }

    const chartState = { candles: candlesRef.current, usdChange24h };

    drawBillboardChart(chartSurface.context, chartState);
    chartSurface.texture.needsUpdate = true;
    chartEndpointRef.current = resolveBillboardChartEndpoint(chartState);
    lastChartKeyRef.current = chartKey;
    lastChartDrawnAtRef.current = nowMs;
  };

  const sampleBillboard = (nowMs: number, shouldSnap: boolean): void => {
    const state = readBillboardState(candlesRef.current);
    updateBillboardPriceMotion(priceMotionsRef.current.krw, state.krw, nowMs, shouldSnap);
    updateBillboardPriceMotion(priceMotionsRef.current.usd, state.usd, nowMs, shouldSnap);

    const signature = createStateSignature(state);
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      isOnlineRef.current = resolveBillboardOnlineStatus(state);
      redrawBillboard(state);
    }

    lastSampledAtRef.current = nowMs;
    needsPriceRedrawRef.current = true;
  };

  const requestPriceSnap = useCallback((): void => {
    shouldSnapNextSampleRef.current = true;
  }, []);

  /** 웹폰트가 늦게 오면 대체 글꼴로 구운 텍스처를 한 번 다시 그림. */
  const redrawAfterFontsLoad = (): void => {
    lastSignatureRef.current = "";
    lastChartKeyRef.current = "";
    lastPriceTextsRef.current = { krw: "", usd: "" };
    requestPriceSnap();
  };

  const initializeBillboard = (): (() => void) => {
    // 패널이 화면보다 훨씬 큰 텍스처라 항상 축소되어 그려진다. 이방성 필터를
    // 올리지 않으면(기본 1) 비스듬히 볼 때 글자가 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    surface.texture.needsUpdate = true;
    chartSurface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // 텍스처가 새로 만들어지면 값이 같아도 새 표면에 반드시 다시 그린다.
    lastSignatureRef.current = "";
    lastChartKeyRef.current = "";
    lastPriceTextsRef.current = { krw: "", usd: "" };
    sampleBillboard(0, true);
    redrawChartIfChanged(0, true);
    redrawPrices(0);

    return () => {
      surface.texture.dispose();
      chartSurface.texture.dispose();
      priceSurfaces.krw.texture.dispose();
      priceSurfaces.usd.texture.dispose();
    };
  };

  const advanceBillboard = (nowMs: number, deltaSeconds: number): void => {
    const shouldSnap = shouldSnapNextSampleRef.current || deltaSeconds > 0.5;
    const shouldDrawImmediately = shouldSnap || !isCountUp || prefersReducedMotion;

    if (shouldSnap || nowMs - lastSampledAtRef.current >= BILLBOARD_TEXTURE.minRedrawIntervalMs) {
      sampleBillboard(nowMs, shouldDrawImmediately);
      shouldSnapNextSampleRef.current = false;
    }

    redrawChartIfChanged(nowMs, shouldSnap);

    if (!needsPriceRedrawRef.current) {
      return;
    }

    if (
      !shouldDrawImmediately &&
      nowMs - lastPricesDrawnAtRef.current < BILLBOARD_PRICE_MOTION.minRedrawIntervalMs
    ) {
      return;
    }

    redrawPrices(nowMs);
    lastPricesDrawnAtRef.current = nowMs;
    needsPriceRedrawRef.current =
      isBillboardPriceMotionActive(priceMotionsRef.current.krw, nowMs) ||
      isBillboardPriceMotionActive(priceMotionsRef.current.usd, nowMs);
  };
  // endregion


  // region [Events]
  const onChangeVisibilityDocument = useCallback((): void => {
    requestPriceSnap();
  }, [requestPriceSnap]);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    return initializeBillboard();
  }, [renderer, surface, chartSurface, priceSurfaces]);

  useEffect(() => {
    requestPriceSnap();
  }, [isCountUp, prefersReducedMotion, requestPriceSnap]);

  useEffect(() => {
    let isMounted = true;

    loadScreenFonts().then((hasLoaded) => {
      if (isMounted && hasLoaded) {
        redrawAfterFontsLoad();
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", onChangeVisibilityDocument);

    return () => {
      document.removeEventListener("visibilitychange", onChangeVisibilityDocument);
    };
  }, [onChangeVisibilityDocument]);

  useFrame(({ clock }, deltaSeconds) => {
    advanceBillboard(clock.elapsedTime * 1000, deltaSeconds);
  });
  // endregion

  // 가격 텍스처·펄스 좌표가 모두 패널 중심 기준이라 패널을 원점에 둔다.
  // 액자 안으로 들어가는 위치·회전·축소는 호출부(`SpaceScene`)가 맡는다.
  //
  // 테두리 메시는 없다. 맵의 금장 액자가 테두리이고, 그 안에 또 넣으면 홈이
  // 두 겹으로 보인다.
  return (
    <group>
      {/* 자체 발광 패널이라 조명 영향을 받지 않는 기본 재질을 쓴다. */}
      <mesh>
        <planeGeometry args={[SPACE_BILLBOARD.width, SPACE_BILLBOARD.height]} />
        <meshBasicMaterial
          map={surface.texture}
          toneMapped={false}
          onBeforeCompile={sharpenScreenMapSampling}
          customProgramCacheKey={resolveScreenMaterialCacheKey}
        />
      </mesh>

      {/* 2초마다 자라는 차트만 따로 올림. 투명이라 아래 카드 배경이 비침. */}
      <mesh position={CHART_PLACEMENT.position}>
        <planeGeometry args={[CHART_PLACEMENT.width, CHART_PLACEMENT.height]} />
        <meshBasicMaterial
          map={chartSurface.texture}
          transparent
          depthWrite={false}
          toneMapped={false}
          onBeforeCompile={sharpenScreenMapSampling}
          customProgramCacheKey={resolveScreenMaterialCacheKey}
        />
      </mesh>

      <mesh position={PRICE_PLACEMENTS.krw.position}>
        <planeGeometry args={[PRICE_PLACEMENTS.krw.width, PRICE_PLACEMENTS.krw.height]} />
        <meshBasicMaterial
          map={priceSurfaces.krw.texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position={PRICE_PLACEMENTS.usd.position}>
        <planeGeometry args={[PRICE_PLACEMENTS.usd.width, PRICE_PLACEMENTS.usd.height]} />
        <meshBasicMaterial
          map={priceSurfaces.usd.texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <BillboardChartPulse
        endpointRef={chartEndpointRef}
        prefersReducedMotion={prefersReducedMotion}
      />

      <BillboardOnlinePulse
        isOnlineRef={isOnlineRef}
        prefersReducedMotion={prefersReducedMotion}
      />
    </group>
  );
}

const MemoizedPriceBillboard = memo(PriceBillboard);
MemoizedPriceBillboard.displayName = "PriceBillboard";

export default MemoizedPriceBillboard;
