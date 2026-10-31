"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useBitcoinStore } from "@/entities/bitcoin";
import { usePriceMiniChartData } from "@/entities/bitcoin/client";
import { SPACE_BILLBOARD } from "@/entities/space";
import {
  BILLBOARD_COLORS,
  BILLBOARD_TEXTURE,
  type BillboardState,
  drawBillboard,
} from "@/views/space/lib/billboardTexture";

interface BillboardSurface {
  canvasElement: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  texture: CanvasTexture;
}

// region [Privates]
const createBillboardSurface = (): BillboardSurface => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = BILLBOARD_TEXTURE.width;
  canvasElement.height = BILLBOARD_TEXTURE.height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  return { canvasElement, context: canvasElement.getContext("2d"), texture };
};

/**
 * 변경 감지용 서명.
 *
 * 시계열은 15분마다 갱신되고 길이가 288이라 전부 비교하면 비싸다. 길이와 끝값만
 * 봐도 갱신 여부를 가릴 수 있다.
 */
const createStateSignature = (state: BillboardState): string => {
  return [
    state.krw,
    state.usd,
    state.krwChange24h,
    state.usdChange24h,
    state.isKrwConnected,
    state.isUsdConnected,
    state.usdSeries.length,
    state.usdSeries[state.usdSeries.length - 1] ?? 0,
  ].join("|");
};

const readBillboardState = (usdSeries: readonly number[]): BillboardState => {
  const { bitcoinPrice } = useBitcoinStore.getState();

  return {
    krw: bitcoinPrice.krw,
    usd: bitcoinPrice.usd,
    krwChange24h: bitcoinPrice.krwChange24h,
    usdChange24h: bitcoinPrice.usdChange24h,
    isKrwConnected: bitcoinPrice.isKrwConnected ?? false,
    isUsdConnected: bitcoinPrice.isUsdConnected ?? false,
    usdSeries,
  };
};

const EMPTY_SERIES: readonly number[] = [];
// endregion

/**
 * 비트코인 가격 전광판.
 *
 * 시세는 거래소 소켓을 통해 초당 수십 번 바뀐다. 스토어를 React 로 구독하면
 * 그 빈도로 리렌더가 나므로, 프레임 루프에서 명령형으로 읽고 4 Hz 로 묶어
 * 캔버스를 다시 그린다.
 */
function PriceBillboard(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const surface = useMemo(() => createBillboardSurface(), []);
  const { priceMiniChartData } = usePriceMiniChartData();
  const lastDrawnAtRef = useRef<number>(0);
  const lastSignatureRef = useRef<string>("");
  /** 프레임 루프에서 읽어야 하므로 ref 로 둔다. 쿼리 갱신은 15분에 한 번이다. */
  const usdSeriesRef = useRef<readonly number[]>(EMPTY_SERIES);

  usdSeriesRef.current = priceMiniChartData?.price ?? EMPTY_SERIES;
  // endregion

  // region [Privates]
  const redrawBillboard = (state: BillboardState): void => {
    if (!surface.context) {
      return;
    }

    drawBillboard(surface.context, state);
    surface.texture.needsUpdate = true;
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // 패널이 화면보다 훨씬 큰 텍스처라 항상 축소되어 그려진다. 이방성 필터를
    // 올리지 않으면(기본 1) 비스듬히 볼 때 글자가 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    surface.texture.needsUpdate = true;

    redrawBillboard(readBillboardState(usdSeriesRef.current));

    return () => {
      surface.texture.dispose();
    };
  }, [renderer, surface]);

  useFrame(({ clock }) => {
    const nowMs = clock.elapsedTime * 1000;

    if (nowMs - lastDrawnAtRef.current < BILLBOARD_TEXTURE.minRedrawIntervalMs) {
      return;
    }

    lastDrawnAtRef.current = nowMs;

    const state = readBillboardState(usdSeriesRef.current);
    const signature = createStateSignature(state);

    if (signature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = signature;
    redrawBillboard(state);
  });
  // endregion

  return (
    <group>
      <mesh position={SPACE_BILLBOARD.frameOffset}>
        <planeGeometry args={[SPACE_BILLBOARD.frameWidth, SPACE_BILLBOARD.frameHeight]} />
        <meshStandardMaterial color={BILLBOARD_COLORS.panelEdge} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* 자체 발광 패널이라 조명 영향을 받지 않는 기본 재질을 쓴다. */}
      <mesh position={SPACE_BILLBOARD.offset}>
        <planeGeometry args={[SPACE_BILLBOARD.width, SPACE_BILLBOARD.height]} />
        <meshBasicMaterial map={surface.texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

const MemoizedPriceBillboard = memo(PriceBillboard);
MemoizedPriceBillboard.displayName = "PriceBillboard";

export default MemoizedPriceBillboard;
