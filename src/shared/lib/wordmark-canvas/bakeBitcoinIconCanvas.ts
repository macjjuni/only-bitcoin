import {
  BITCOIN_ICON_CENTER_X,
  BITCOIN_ICON_CENTER_Y,
  BITCOIN_ICON_PATH,
  BITCOIN_ICON_RADIUS,
} from "../bitcoinIconCanvas";
import {
  BAKE_PADDING_IN_CSS_PX,
  type BakedWordmark,
  resolvePixelRatio,
} from "./bakeWordmarkCanvas";
import { CHANNEL_CYAN_COLOR, CHANNEL_MAGENTA_COLOR } from "./glitchPreset";

// region [Constants]
// 패스·좌표는 `shared/lib/bitcoinIconCanvas` 가 들고 있다. 헤더 아이콘과 같은 모양이어야 한다.
// endregion

// region [Privates]
function create2dCanvas(
  widthInDevicePx: number,
  heightInDevicePx: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("캔버스 컨텍스트를 만들지 못했음.");
  }
  return [canvas, context];
}

/** 아이콘 박스(패딩 포함) 캔버스를 만들고 패스 좌표계로 맞춰 둠. */
function createIconCanvas(sizeInCssPx: number): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  sideInDevicePx: number;
  pixelRatio: number;
} {
  const pixelRatio = resolvePixelRatio();
  const sideInDevicePx = Math.round((sizeInCssPx + BAKE_PADDING_IN_CSS_PX * 2) * pixelRatio);
  const [canvas, context] = create2dCanvas(sideInDevicePx, sideInDevicePx);
  const scale = (sizeInCssPx * pixelRatio) / (BITCOIN_ICON_RADIUS * 2);

  context.translate(sideInDevicePx / 2, sideInDevicePx / 2);
  context.scale(scale, scale);
  context.translate(-BITCOIN_ICON_CENTER_X, -BITCOIN_ICON_CENTER_Y);

  return { canvas, context, sideInDevicePx, pixelRatio };
}
// endregion

// region [Factory]
/** 원본 알파는 두고 색만 갈아 끼운 사본을 만듦. */
export function createTintedCanvas(
  sourceCanvas: HTMLCanvasElement,
  tintColor: string,
): HTMLCanvasElement {
  const [canvas, context] = create2dCanvas(sourceCanvas.width, sourceCanvas.height);

  context.drawImage(sourceCanvas, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = tintColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * 비트코인 원형 아이콘을 `BakedWordmark` 모양으로 구움.
 * 패스라서 `<foreignObject>` 없이 `Path2D` 로 바로 그림. 패딩은 워드마크와 같게 둬서 기존 컨트롤러가 그대로 돎.
 */
export function bakeBitcoinIconCanvas(sizeInCssPx: number, fillColor: string): BakedWordmark {
  const { canvas, context, sideInDevicePx, pixelRatio } = createIconCanvas(sizeInCssPx);

  context.fillStyle = fillColor;
  // `B` 가 뚫린 모양이라 evenodd 필수.
  context.fill(new Path2D(BITCOIN_ICON_PATH), "evenodd");

  return {
    baseCanvas: canvas,
    cyanCanvas: createTintedCanvas(canvas, CHANNEL_CYAN_COLOR),
    magentaCanvas: createTintedCanvas(canvas, CHANNEL_MAGENTA_COLOR),
    widthInDevicePx: sideInDevicePx,
    heightInDevicePx: sideInDevicePx,
    pixelRatio,
  };
}
// endregion
