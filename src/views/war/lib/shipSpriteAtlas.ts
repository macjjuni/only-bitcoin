import type { TradeMagnitude, TradeSide } from "@/entities/order-flow";
import {
  SHIP_ATLAS_FRAMES,
  SHIP_ATLAS_IMAGE_PATH,
  type ShipAtlasFrameKey,
} from "../model/shipAtlasFrames";

/** 캔버스가 `drawImage` 9-인자 형태로 바로 넘길 수 있는 스프라이트 한 장. */
export interface ShipSprite {
  source: CanvasImageSource;
  sourceXInPx: number;
  sourceYInPx: number;
  sourceWidthInPx: number;
  sourceHeightInPx: number;
  /** 가로 대비 세로 비율. 그릴 폭만 정하면 높이가 따라 나온다. */
  heightPerWidthRatio: number;
}

export interface ShipSpriteAtlas {
  getSprite: (magnitude: TradeMagnitude, side: TradeSide) => ShipSprite;
}

/**
 * 아틀라스 이미지를 받아 프레임별로 잘라 둔다.
 *
 * `createImageBitmap` 은 잘라내기와 디코딩을 한 번에 끝내 준다. 매 프레임 원본 한 장에서
 * 부분 영역을 읽는 것보다 GPU 업로드가 안정적이라 유닛이 수백 개일 때 차이가 난다.
 * 지원하지 않는 브라우저에서는 원본 이미지에 프레임 좌표를 그대로 물려 돌려준다.
 */
async function createSpriteTable(
  atlasImage: HTMLImageElement,
): Promise<Record<ShipAtlasFrameKey, ShipSprite>> {
  const frameKeys = Object.keys(SHIP_ATLAS_FRAMES) as ShipAtlasFrameKey[];
  const canDecodeToBitmap = typeof createImageBitmap === "function";

  const sprites = await Promise.all(
    frameKeys.map(async (frameKey): Promise<ShipSprite> => {
      const frame = SHIP_ATLAS_FRAMES[frameKey];
      const heightPerWidthRatio = frame.heightInPx / frame.widthInPx;

      if (!canDecodeToBitmap) {
        return {
          source: atlasImage,
          sourceXInPx: frame.xInPx,
          sourceYInPx: frame.yInPx,
          sourceWidthInPx: frame.widthInPx,
          sourceHeightInPx: frame.heightInPx,
          heightPerWidthRatio,
        };
      }

      const frameBitmap = await createImageBitmap(
        atlasImage,
        frame.xInPx,
        frame.yInPx,
        frame.widthInPx,
        frame.heightInPx,
      );

      return {
        source: frameBitmap,
        sourceXInPx: 0,
        sourceYInPx: 0,
        sourceWidthInPx: frame.widthInPx,
        sourceHeightInPx: frame.heightInPx,
        heightPerWidthRatio,
      };
    }),
  );

  return Object.fromEntries(
    frameKeys.map((frameKey, frameIndex) => [frameKey, sprites[frameIndex]]),
  ) as Record<ShipAtlasFrameKey, ShipSprite>;
}

function loadAtlasImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const atlasImage = new Image();

    atlasImage.onload = () => resolve(atlasImage);
    atlasImage.onerror = () => reject(new Error(`아틀라스 로드 실패: ${SHIP_ATLAS_IMAGE_PATH}`));
    atlasImage.src = SHIP_ATLAS_IMAGE_PATH;
  });
}

/**
 * 아틀라스 적재는 화면당 한 번이면 된다.
 *
 * 캔버스가 다시 마운트되거나 렌더러를 오갈 때마다 새로 받지 않도록 모듈 수준에 물려 둔다.
 * 실패하면 다음 호출에서 다시 시도할 수 있게 캐시를 비운다.
 */
let atlasLoadPromise: Promise<ShipSpriteAtlas> | null = null;

export function loadShipSpriteAtlas(): Promise<ShipSpriteAtlas> {
  if (atlasLoadPromise !== null) {
    return atlasLoadPromise;
  }

  atlasLoadPromise = loadAtlasImage()
    .then(createSpriteTable)
    .then((spriteTable) => ({
      getSprite: (magnitude: TradeMagnitude, side: TradeSide): ShipSprite =>
        spriteTable[`${magnitude}_${side}`],
    }))
    .catch((loadError: unknown) => {
      atlasLoadPromise = null;
      throw loadError;
    });

  return atlasLoadPromise;
}
