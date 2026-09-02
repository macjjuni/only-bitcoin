/**
 * 우주선 아틀라스 프레임 좌표표.
 *
 * `scripts/pack-ship-atlas.py` 가 생성한다. 직접 고치지 말 것.
 */

import type { TradeMagnitude, TradeSide } from "@/entities/order-flow";

export const SHIP_ATLAS_IMAGE_PATH = "/images/war/ship-atlas.webp";

export const SHIP_ATLAS_WIDTH_IN_PX = 488;
export const SHIP_ATLAS_HEIGHT_IN_PX = 686;

/** 아틀라스 안에서 스프라이트 한 장이 차지하는 사각형. */
export interface ShipAtlasFrame {
  xInPx: number;
  yInPx: number;
  widthInPx: number;
  heightInPx: number;
}

export type ShipAtlasFrameKey = `${TradeMagnitude}_${TradeSide}`;

export const SHIP_ATLAS_FRAMES: Record<ShipAtlasFrameKey, ShipAtlasFrame> = {
  small_buy: { xInPx: 7, yInPx: 2, widthInPx: 230, heightInPx: 226 },
  small_sell: { xInPx: 250, yInPx: 2, widthInPx: 230, heightInPx: 225 },
  medium_buy: { xInPx: 10, yInPx: 230, widthInPx: 224, heightInPx: 224 },
  medium_sell: { xInPx: 253, yInPx: 231, widthInPx: 224, heightInPx: 222 },
  large_buy: { xInPx: 2, yInPx: 456, widthInPx: 240, heightInPx: 122 },
  large_sell: { xInPx: 245, yInPx: 456, widthInPx: 241, heightInPx: 123 },
  huge_buy: { xInPx: 2, yInPx: 581, widthInPx: 241, heightInPx: 103 },
  huge_sell: { xInPx: 245, yInPx: 581, widthInPx: 240, heightInPx: 102 },
};
