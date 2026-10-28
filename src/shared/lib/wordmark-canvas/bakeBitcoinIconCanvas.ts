import {
  BAKE_PADDING_IN_CSS_PX,
  type BakedWordmark,
  resolvePixelRatio,
} from "./bakeWordmarkCanvas";
import { CHANNEL_CYAN_COLOR, CHANNEL_MAGENTA_COLOR } from "./glitchPreset";

// region [Constants]
/** kku-ui `bitcoin` 아이콘 패스. 헤더 아이콘과 같은 모양이어야 해서 그대로 옮겼음. */
const BITCOIN_ICON_PATH =
  "M33.2538 16.1292C33.2538 25.0371 26.0329 32.2584 17.1255 32.2584C8.21799 32.2584 0.99707 25.0371 0.99707 16.1292C0.99707 7.22128 8.21799 0 17.1255 0C26.0329 0 33.2538 7.22128 33.2538 16.1292ZM21.0002 10.1366C23.2438 10.9071 24.8849 12.0607 24.5629 14.2077C24.3291 15.7799 23.4543 16.5403 22.2921 16.8065C23.8866 17.6335 24.4301 19.2029 23.9251 21.1005C22.9664 23.8314 20.6874 24.0613 17.6562 23.4905L16.9202 26.4261L15.1434 25.9844L15.8693 23.0882C15.4087 22.9742 14.9379 22.8522 14.4529 22.7221L13.724 25.6325L11.9492 25.1908L12.6842 22.2491L9.10534 21.3496L9.98817 19.3226C9.98817 19.3226 11.2982 19.6685 11.28 19.6433C11.7832 19.7673 12.0069 19.4406 12.095 19.2238L14.0895 11.256C14.1117 10.8798 13.9811 10.4059 13.2613 10.2264C13.2886 10.2072 11.9705 9.90669 11.9705 9.90669L12.4433 8.01585L16.0272 8.90026L16.7562 5.99188L18.532 6.43358L17.8182 9.28448C18.2961 9.39238 18.776 9.5023 19.2427 9.61828L19.9514 6.78553L21.7282 7.22724L21.0002 10.1366ZM16.7488 14.9882C17.9591 15.3091 20.5928 16.0074 21.0519 14.1765C21.5202 12.3033 18.9615 11.7376 17.7087 11.4606L17.7086 11.4606L17.7085 11.4606C17.5666 11.4292 17.4414 11.4015 17.3393 11.3761L16.4545 14.9117C16.5388 14.9325 16.6378 14.9588 16.7488 14.9882ZM15.3775 20.6807C16.8271 21.0626 19.9976 21.8977 20.5021 19.8803C21.0185 17.8175 17.9445 17.1305 16.4446 16.7952L16.4441 16.7951C16.2767 16.7577 16.129 16.7247 16.008 16.6946L15.032 20.5913C15.1311 20.6158 15.2472 20.6464 15.3771 20.6806L15.3775 20.6807Z";

/** 패스 원의 중심·반지름( viewBox 좌표 ). 원을 박스에 꽉 맞추는 데 씀. */
const BITCOIN_ICON_CENTER_X = 17.1255;
const BITCOIN_ICON_CENTER_Y = 16.1292;
const BITCOIN_ICON_RADIUS = 16.1292;
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
