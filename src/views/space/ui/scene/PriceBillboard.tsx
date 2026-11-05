"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { type BtcCandle, useBitcoinStore } from "@/entities/bitcoin";
import { useBtcCandlesQuery } from "@/entities/bitcoin/client";
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
  BILLBOARD_PRICE_REGIONS,
  BILLBOARD_TEXTURE,
  type BillboardChartEndpoint,
  type BillboardPriceRegion,
  type BillboardState,
  drawBillboard,
  drawBillboardPrice,
  formatBillboardChange,
  formatBillboardKrw,
  formatBillboardUsd,
  resolveBillboardChartEndpoint,
  resolveBillboardOnlineStatus,
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

/** 캔버스는 왼쪽 위, 3D 패널은 중앙이 원점이므로 Y축을 뒤집어 가격 위치를 맞춘다. */
const resolvePricePlacement = (region: BillboardPriceRegion) => ({
  width: (region.width / BILLBOARD_TEXTURE.width) * SPACE_BILLBOARD.width,
  height: (region.height / BILLBOARD_TEXTURE.height) * SPACE_BILLBOARD.height,
  position: [
    ((region.x + region.width / 2) / BILLBOARD_TEXTURE.width - 0.5) * SPACE_BILLBOARD.width,
    (0.5 - (region.y + region.height / 2) / BILLBOARD_TEXTURE.height) * SPACE_BILLBOARD.height,
    0.002,
  ] as [number, number, number],
});

const PRICE_PLACEMENTS = {
  krw: resolvePricePlacement(BILLBOARD_PRICE_REGIONS.krw),
  usd: resolvePricePlacement(BILLBOARD_PRICE_REGIONS.usd),
};

/**
 * 변경 감지용 서명.
 *
 * 캔들은 1분마다 새로 오고 48개라 전부 비교하면 비쌈. 개수와 마지막 캔들만 봐도
 * 갱신 여부를 가릴 수 있음. 등락률은 화면 글자(소수 한 자리)로 비교함. 원본은
 * 둘째 자리라 시세마다 바뀌어서, 그대로 비교하면 안 보이는 변화로 큰 텍스처를
 * 초당 4번까지 다시 올렸음.
 */
const createStateSignature = (state: BillboardState): string => {
  const lastCandle = state.candles[state.candles.length - 1];

  return [
    Number.isFinite(state.krw) && state.krw > 0,
    Number.isFinite(state.usd) && state.usd > 0,
    formatBillboardChange(state.krwChange24h),
    formatBillboardChange(state.usdChange24h),
    state.isKrwConnected,
    state.isUsdConnected,
    state.candles.length,
    lastCandle
      ? `${lastCandle.openTime}:${lastCandle.high}:${lastCandle.low}:${lastCandle.close}`
      : "",
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

const EMPTY_CANDLES: readonly BtcCandle[] = [];
// endregion

/**
 * 메인 전광판 왼쪽 칸, 비트코인 시세판.
 *
 * 시세는 최대 4 Hz 로 채택하고 가격은 250ms 동안 보간한다. 큰 베이스 텍스처는
 * 상태가 바뀔 때만 갱신하고 숫자 두 칸만 작은 텍스처로 최대 30 Hz 로 그린다.
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
  const { data: candles } = useBtcCandlesQuery();
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
  /** 프레임 루프에서 읽어야 해서 ref 로 둠. 캔들은 1분마다 갱신됨. */
  const candlesRef = useRef<readonly BtcCandle[]>(EMPTY_CANDLES);

  candlesRef.current = candles ?? EMPTY_CANDLES;
  // endregion


  // region [Privates]
  const redrawBillboard = (state: BillboardState): void => {
    if (!surface.context) {
      return;
    }

    drawBillboard(surface.context, state, { shouldDrawPrices: false });
    surface.texture.needsUpdate = true;
  };

  const redrawPrices = (nowMs: number): void => {
    const priceTexts = {
      krw: formatBillboardKrw(readBillboardPriceMotion(priceMotionsRef.current.krw, nowMs)),
      usd: formatBillboardUsd(readBillboardPriceMotion(priceMotionsRef.current.usd, nowMs)),
    };

    for (const currency of ["krw", "usd"] as const) {
      const priceSurface = priceSurfaces[currency];

      if (!priceSurface.context || priceTexts[currency] === lastPriceTextsRef.current[currency]) {
        continue;
      }

      drawBillboardPrice(priceSurface.context, priceTexts[currency], currency);
      priceSurface.texture.needsUpdate = true;
      lastPriceTextsRef.current[currency] = priceTexts[currency];
    }
  };

  const sampleBillboard = (nowMs: number, shouldSnap: boolean): void => {
    const state = readBillboardState(candlesRef.current);
    updateBillboardPriceMotion(priceMotionsRef.current.krw, state.krw, nowMs, shouldSnap);
    updateBillboardPriceMotion(priceMotionsRef.current.usd, state.usd, nowMs, shouldSnap);

    const signature = createStateSignature(state);
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      chartEndpointRef.current = resolveBillboardChartEndpoint(state);
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
    lastPriceTextsRef.current = { krw: "", usd: "" };
    requestPriceSnap();
  };

  const initializeBillboard = (): (() => void) => {
    // 패널이 화면보다 훨씬 큰 텍스처라 항상 축소되어 그려진다. 이방성 필터를
    // 올리지 않으면(기본 1) 비스듬히 볼 때 글자가 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    surface.texture.needsUpdate = true;

    // 텍스처가 새로 만들어지면 값이 같아도 새 표면에 반드시 다시 그린다.
    lastSignatureRef.current = "";
    lastPriceTextsRef.current = { krw: "", usd: "" };
    sampleBillboard(0, true);
    redrawPrices(0);

    return () => {
      surface.texture.dispose();
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
  }, [renderer, surface, priceSurfaces]);

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
