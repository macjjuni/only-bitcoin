"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useBitcoinStore } from "@/entities/bitcoin";
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

/** 변경 감지용 서명. 바뀌지 않았으면 텍스처를 다시 올리지 않는다. */
const createStateSignature = (state: BillboardState): string => {
  return [
    state.krw,
    state.usd,
    state.krwChange24h,
    state.usdChange24h,
    state.isKrwConnected,
    state.isUsdConnected,
  ].join("|");
};

const readBillboardState = (): BillboardState => {
  const { bitcoinPrice } = useBitcoinStore.getState();

  return {
    krw: bitcoinPrice.krw,
    usd: bitcoinPrice.usd,
    krwChange24h: bitcoinPrice.krwChange24h,
    usdChange24h: bitcoinPrice.usdChange24h,
    isKrwConnected: bitcoinPrice.isKrwConnected ?? false,
    isUsdConnected: bitcoinPrice.isUsdConnected ?? false,
  };
};
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
  const surface = useMemo(() => createBillboardSurface(), []);
  const lastDrawnAtRef = useRef<number>(0);
  const lastSignatureRef = useRef<string>("");
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
    redrawBillboard(readBillboardState());

    return () => {
      surface.texture.dispose();
    };
  }, [surface]);

  useFrame(({ clock }) => {
    const nowMs = clock.elapsedTime * 1000;

    if (nowMs - lastDrawnAtRef.current < BILLBOARD_TEXTURE.minRedrawIntervalMs) {
      return;
    }

    lastDrawnAtRef.current = nowMs;

    const state = readBillboardState();
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
      <mesh position={SPACE_BILLBOARD.framePosition}>
        <planeGeometry args={[SPACE_BILLBOARD.frameWidth, SPACE_BILLBOARD.frameHeight]} />
        <meshStandardMaterial color={BILLBOARD_COLORS.panelEdge} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* 자체 발광 패널이라 조명 영향을 받지 않는 기본 재질을 쓴다. */}
      <mesh position={SPACE_BILLBOARD.position}>
        <planeGeometry args={[SPACE_BILLBOARD.width, SPACE_BILLBOARD.height]} />
        <meshBasicMaterial map={surface.texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

const MemoizedPriceBillboard = memo(PriceBillboard);
MemoizedPriceBillboard.displayName = "PriceBillboard";

export default MemoizedPriceBillboard;
