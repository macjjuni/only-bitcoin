"use client";

import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type Texture } from "three";
import type { SpaceAdBoardId, SpaceAdBoardPlacement } from "@/entities/space";
import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 광고 슬롯.
 *
 * 3단계에서 라이트닝 결제로 판매할 자리다. 1단계는 플레이스홀더만 그리고
 * 모양만 고정해 둔다. 외부 이미지를 불러오지 않으므로 CORS·CSP 변경이 없다.
 */
export interface AdSlot {
  id: SpaceAdBoardId;
  imageUrl: string | null;
  linkUrl: string | null;
  expiresAt: number | null;
}

const PLACEHOLDER_TEXTURE_SIZE = { width: 768, height: 512 } as const;
const PLACEHOLDER_BACKGROUND = "#0b1018";
const PLACEHOLDER_BORDER = "#1f2a3b";
const PLACEHOLDER_SUBTEXT = "#6d788c";

interface AdBoardProps {
  placement: SpaceAdBoardPlacement;
}

// region [Privates]
const createPlaceholderTexture = (): Texture => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = PLACEHOLDER_TEXTURE_SIZE.width;
  canvasElement.height = PLACEHOLDER_TEXTURE_SIZE.height;

  const context = canvasElement.getContext("2d");
  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  if (!context) {
    return texture;
  }

  const { width, height } = PLACEHOLDER_TEXTURE_SIZE;

  context.fillStyle = PLACEHOLDER_BACKGROUND;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = PLACEHOLDER_BORDER;
  context.lineWidth = 8;
  context.setLineDash([24, 18]);
  context.strokeRect(20, 20, width - 40, height - 40);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 72px system-ui, sans-serif";
  context.fillStyle = BITCOIN_COLOR;
  context.fillText("광고 문의", width / 2, height / 2 - 28);

  context.font = "500 38px system-ui, sans-serif";
  context.fillStyle = PLACEHOLDER_SUBTEXT;
  context.fillText("Lightning 결제 예정", width / 2, height / 2 + 52);

  texture.needsUpdate = true;

  return texture;
};
// endregion

function AdBoard({ placement }: AdBoardProps): ReactNode {
  // region [Hooks]
  const placeholderTexture = useMemo(() => createPlaceholderTexture(), []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    return () => {
      placeholderTexture.dispose();
    };
  }, [placeholderTexture]);
  // endregion

  return (
    <group position={placement.offset} rotation={[0, placement.rotationY, 0]}>
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[placement.width + 0.4, placement.height + 0.4]} />
        <meshStandardMaterial color={PLACEHOLDER_BORDER} roughness={0.6} metalness={0.35} />
      </mesh>

      {/* 3단계에서 `AdSlot.imageUrl` 의 3:2 crop 텍스처와 `slot` prop 이 들어온다. */}
      <mesh>
        <planeGeometry args={[placement.width, placement.height]} />
        <meshBasicMaterial map={placeholderTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

const MemoizedAdBoard = memo(AdBoard);
MemoizedAdBoard.displayName = "AdBoard";

export default MemoizedAdBoard;
