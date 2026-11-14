"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Vector2 } from "three";
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
  createTickerSlotSignatures,
  drawTickerSlot,
  resolveChangedTickerSlots,
  resolveTickerItems,
  TICKER_SCROLL_SPEED,
  TICKER_TEXTURE,
  type TickerState,
} from "@/views/space/lib/tickerTexture";

/** 값이 바뀌었는지 보는 간격(초). 환율·지수는 분 단위로 움직여서 자주 볼 이유가 없다. */
const STATE_CHECK_INTERVAL_SECONDS = 1;

// region [Privates]
/**
 * 패널에 한 번에 비치는 가로 비율.
 *
 * 흐를 때는 한 바퀴(45 m)의 28 m 만 보이고 나머지는 흘러 들어온다. 멈춰 있을
 * 때 그렇게 두면 화면 밖 칸을 영영 못 보므로, 한 바퀴를 통째로 눌러 담는다.
 * 글자는 그만큼 작아지지만 다섯 지표가 모두 보인다.
 */
const resolveRepeatX = (prefersReducedMotion: boolean): number => {
  return prefersReducedMotion ? 1 : SPACE_TICKER_FRAME.width / TICKER_TEXTURE.cycleLength;
};

const createTickerSurface = () => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = TICKER_TEXTURE.width;
  canvasElement.height = TICKER_TEXTURE.height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;
  // 한 바퀴가 패널보다 길다. 남는 만큼은 반복으로 이어 붙여 흘린다.
  texture.wrapS = RepeatWrapping;

  // 바뀐 칸만 GPU 에 올릴 때 거치는 칸 크기 캔버스. 씬에는 안 붙이고 복사 원본으로만 씀.
  const slotCanvasElement = document.createElement("canvas");
  slotCanvasElement.width = TICKER_TEXTURE.slotWidth;
  slotCanvasElement.height = TICKER_TEXTURE.height;

  return {
    canvasElement,
    texture,
    context: canvasElement.getContext("2d"),
    slotTexture: new CanvasTexture(slotCanvasElement),
    slotContext: slotCanvasElement.getContext("2d"),
  };
};

/** 칸을 올릴 자리. 프레임마다 새로 만들지 않으려고 하나를 돌려 씀. */
const slotUploadPosition = new Vector2();
// endregion

/**
 * 메인 액자 위 티커 테이프.
 *
 * 도미넌스·김프·환율·공포탐욕을 한 줄로 흘린다. 글자를 매 프레임 다시 굽지
 * 않고 텍스처 `offset.x` 만 민다. 네 칸 폭이 같아서 한 바퀴가 끝나고 처음이
 * 이어 붙어도 간격이 어긋나지 않는다.
 *
 * 스토어를 구독하지 않고 1초마다 들여다보고, 글자가 바뀐 칸만 다시 굽는다.
 * 김프는 소수 둘째 자리라 거의 매번 바뀌는데, 그때 한 바퀴(4000 px)를 통째로 올리지
 * 않고 그 칸(800 px)만 GPU 텍스처에 덮어쓴다.
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
  /** 마지막으로 구운 칸별 서명. 비우면 다음 확인 때 전부 다시 굽는다. */
  const slotSignaturesRef = useRef<readonly string[]>([]);
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

  /**
   * 칸 하나만 GPU 텍스처에 덮어쓴다.
   *
   * 한 바퀴 캔버스에서 그 칸을 작은 캔버스로 옮긴 뒤 올린다. 한 바퀴 캔버스는 늘 최신으로
   * 두므로, 컨텍스트가 복구돼 통째로 다시 올라갈 때도 화면이 맞는다.
   */
  const uploadSlot = (slotIndex: number): void => {
    const { canvasElement, texture, slotTexture, slotContext } = surface;
    const left = TICKER_TEXTURE.slotWidth * slotIndex;

    slotContext?.drawImage(
      canvasElement,
      left,
      0,
      TICKER_TEXTURE.slotWidth,
      TICKER_TEXTURE.height,
      0,
      0,
      TICKER_TEXTURE.slotWidth,
      TICKER_TEXTURE.height,
    );
    renderer.copyTextureToTexture(slotTexture, texture, null, slotUploadPosition.set(left, 0));
  };

  const redrawIfChanged = (): void => {
    const { context, texture, slotContext } = surface;

    if (!context) {
      return;
    }

    const items = resolveTickerItems(readTickerState());
    const signatures = createTickerSlotSignatures(items);
    const changedSlots = resolveChangedTickerSlots(slotSignaturesRef.current, signatures);

    if (changedSlots.length === 0) {
      return;
    }

    for (const slotIndex of changedSlots) {
      drawTickerSlot(context, items[slotIndex], slotIndex);
    }
    slotSignaturesRef.current = signatures;

    // 전부 바뀌었으면(처음 · 폰트 도착) 통째로 올리는 게 쌈. 텍스처가 기기 상한보다 커서
    // 줄여 올라간 기기에서는 칸 자리가 안 맞아 부분으로 못 올림.
    const canUploadSlots =
      slotContext !== null &&
      changedSlots.length < TICKER_TEXTURE.slotCount &&
      renderer.capabilities.maxTextureSize >= TICKER_TEXTURE.width;

    // 통째로 올릴 것이 아직 안 올라갔으면(처음 굽고 화면에 한 번도 안 그려진 경우 등) 그대로 둠.
    // 한 바퀴 캔버스는 방금 고쳐 놨으니 그때 같이 올라감. 여기서 칸을 올리면 그 통째 올리기가
    // 밉맵을 끈 채로 먼저 실행돼, 텍스처가 밉맵 자리 없이 만들어지고 뒤에 다시 만들 수 없음.
    const uploadedVersion = (renderer.properties.get(texture) as { __version?: number }).__version;
    const hasPendingFullUpload = uploadedVersion !== texture.version;

    if (!canUploadSlots || hasPendingFullUpload) {
      texture.needsUpdate = true;
      return;
    }

    // 칸을 올릴 때마다 한 바퀴 전체의 밉맵을 다시 만듦. 여러 칸이 같이 바뀌면 마지막 칸에서만 만들게 함.
    changedSlots.forEach((slotIndex, order) => {
      texture.generateMipmaps = order === changedSlots.length - 1;
      uploadSlot(slotIndex);
    });
    texture.generateMipmaps = true;
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
  }, [dominance, marketCapUsd, fearGreed]);

  useEffect(() => {
    // 패널이 가로로 길어 항상 축소되어 그려진다. 기본 이방성(1)이면 글자가 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    slotSignaturesRef.current = [];
    redrawIfChanged();

    return () => {
      surface.texture.dispose();
      surface.slotTexture.dispose();
    };
  }, [renderer, surface]);

  useEffect(() => {
    // 멈춘 동안에는 한 바퀴를 통째로 보여 줘야 해서 배율과 시작 위치를 되돌린다.
    surface.texture.repeat.setX(resolveRepeatX(prefersReducedMotion));

    if (prefersReducedMotion) {
      surface.texture.offset.x = 0;
    }
  }, [surface, prefersReducedMotion]);

  useEffect(() => {
    let isMounted = true;

    // 캔버스는 웹폰트를 기다려 주지 않는다. 늦게 오면 한 번 다시 굽는다.
    loadScreenFonts().then((hasLoaded) => {
      if (isMounted && hasLoaded) {
        slotSignaturesRef.current = [];
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
