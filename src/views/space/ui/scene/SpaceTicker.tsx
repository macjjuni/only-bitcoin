"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { useBitcoinStore } from "@/entities/bitcoin";
import {
  useBitcoinDominanceQuery,
  useBitcoinMarketCapQuery,
  useFearGreedIndex,
} from "@/entities/bitcoin/client";
import { SPACE_TICKER_FRAME } from "@/entities/space";
import { usePrefersReducedMotion } from "@/features/space-controls";
import { calcPremiumPercent } from "@/shared/utils/calculate";
import { loadScreenFonts } from "@/views/space/lib/screenCanvas";
import {
  resolveScreenMaterialCacheKey,
  sharpenScreenMapSampling,
} from "@/views/space/lib/screenMaterial";
import {
  createTickerSignature,
  drawTicker,
  resolveTickerItems,
  TICKER_SCROLL_SPEED,
  TICKER_TEXTURE,
  type TickerState,
} from "@/views/space/lib/tickerTexture";

/** 값이 바뀌었는지 보는 간격(초). 환율·지수는 분 단위로 움직여서 자주 볼 이유가 없다. */
const STATE_CHECK_INTERVAL_SECONDS = 1;

// region [Privates]
const createTickerSurface = () => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = TICKER_TEXTURE.width;
  canvasElement.height = TICKER_TEXTURE.height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;
  // 한 바퀴(40 m)가 패널(28 m)보다 길다. 남는 만큼은 반복으로 이어 붙여 흘린다.
  texture.wrapS = RepeatWrapping;
  texture.repeat.set(SPACE_TICKER_FRAME.width / TICKER_TEXTURE.cycleLength, 1);

  return { texture, context: canvasElement.getContext("2d") };
};
// endregion

/**
 * 메인 액자 위 티커 테이프.
 *
 * 도미넌스·김프·환율·공포탐욕을 한 줄로 흘린다. 글자를 매 프레임 다시 굽지
 * 않고 텍스처 `offset.x` 만 민다. 네 칸 폭이 같아서 한 바퀴가 끝나고 처음이
 * 이어 붙어도 간격이 어긋나지 않는다.
 *
 * 시세는 초당 수십 번 바뀌지만 김프는 소수 둘째 자리라 표시가 거의 그대로다.
 * 그래서 스토어를 구독하지 않고 1초마다 들여다보고, 글자가 바뀔 때만 다시 굽는다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceTicker(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const surface = useMemo(() => createTickerSurface(), []);
  const prefersReducedMotion = usePrefersReducedMotion();
  /** 10분에 한 번 바뀌는 값이라 구독해도 리렌더가 거의 없다. */
  const dominance = useBitcoinDominanceQuery();
  const marketCapUsd = useBitcoinMarketCapQuery();
  const fearGreed = useFearGreedIndex();
  const macroRef = useRef({ dominance, marketCapUsd, fearGreed });
  const lastSignatureRef = useRef<string>("");
  const elapsedSinceCheckRef = useRef<number>(STATE_CHECK_INTERVAL_SECONDS);
  // endregion


  // region [Privates]
  const readTickerState = (): TickerState => {
    const { bitcoinPrice, exRate } = useBitcoinStore.getState();
    const hasPremiumInput = bitcoinPrice.krw > 0 && bitcoinPrice.usd > 0 && exRate.value > 0;

    return {
      dominance: macroRef.current.dominance || null,
      marketCapUsd: macroRef.current.marketCapUsd || null,
      // 환율이 없으면 김프가 100% 로 튄다. 세 값이 다 찬 뒤에만 계산함.
      premium: hasPremiumInput
        ? calcPremiumPercent(bitcoinPrice.krw, bitcoinPrice.usd, exRate.value)
        : null,
      exRate: exRate.value || null,
      fearGreed: macroRef.current.fearGreed || null,
    };
  };

  const redrawIfChanged = (): void => {
    const { context, texture } = surface;

    if (!context) {
      return;
    }

    const items = resolveTickerItems(readTickerState());
    const signature = createTickerSignature(items);

    if (signature === lastSignatureRef.current) {
      return;
    }

    drawTicker(context, items);
    lastSignatureRef.current = signature;
    texture.needsUpdate = true;
  };

  const advanceScroll = (deltaSeconds: number): void => {
    if (prefersReducedMotion) {
      return;
    }

    // UV 한 바퀴가 월드 한 사이클이다. 초당 흐를 거리를 그 길이로 나눠 UV 속도로 바꾼다.
    const uvPerSecond = TICKER_SCROLL_SPEED / TICKER_TEXTURE.cycleLength;

    surface.texture.offset.x = (surface.texture.offset.x + uvPerSecond * deltaSeconds) % 1;
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    macroRef.current = { dominance, marketCapUsd, fearGreed };
    lastSignatureRef.current = "";
  }, [dominance, marketCapUsd, fearGreed]);

  useEffect(() => {
    // 패널이 가로로 길어 항상 축소되어 그려진다. 기본 이방성(1)이면 글자가 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    lastSignatureRef.current = "";
    redrawIfChanged();

    return () => {
      surface.texture.dispose();
    };
  }, [renderer, surface]);

  useEffect(() => {
    let isMounted = true;

    // 캔버스는 웹폰트를 기다려 주지 않는다. 늦게 오면 한 번 다시 굽는다.
    loadScreenFonts().then((hasLoaded) => {
      if (isMounted && hasLoaded) {
        lastSignatureRef.current = "";
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useFrame((_rootState, deltaSeconds) => {
    advanceScroll(deltaSeconds);
    elapsedSinceCheckRef.current += deltaSeconds;

    if (elapsedSinceCheckRef.current < STATE_CHECK_INTERVAL_SECONDS) {
      return;
    }

    elapsedSinceCheckRef.current = 0;
    redrawIfChanged();
  });
  // endregion

  return (
    <mesh
      position={SPACE_TICKER_FRAME.position}
      rotation={[0, SPACE_TICKER_FRAME.rotationY, 0]}
    >
      <planeGeometry args={[SPACE_TICKER_FRAME.width, SPACE_TICKER_FRAME.height]} />
      {/* 자체 발광 패널이라 조명을 받지 않는 기본 재질을 쓴다. */}
      <meshBasicMaterial
        map={surface.texture}
        toneMapped={false}
        onBeforeCompile={sharpenScreenMapSampling}
        customProgramCacheKey={resolveScreenMaterialCacheKey}
      />
    </mesh>
  );
}

const MemoizedSpaceTicker = memo(SpaceTicker);
MemoizedSpaceTicker.displayName = "SpaceTicker";

export default MemoizedSpaceTicker;
