import { CHANNEL_CYAN_COLOR, CHANNEL_MAGENTA_COLOR } from "./glitchPreset";
import {
  loadInlinedFontFace,
  measureWordmarkFontMetrics,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "./wordmarkFont";

/**
 * HTML/CSS 로 조판한 내용을 캔버스에 **한 번만** 구워 넣는 모듈.
 *
 * `<foreignObject>` 안의 HTML 을 SVG data URI 로 만들어 `<img>` 로 올리고 캔버스에 그린다.
 * 조판을 브라우저 레이아웃 엔진에 맡기므로 자간·굵기·줄바꿈·색이 CSS 와 1:1 로 일치한다.
 *
 * ## 왜 매 프레임이 아니라 한 번인가
 * HTML -> SVG -> `<img>` 디코드는 프레임 예산 안에 절대 못 들어간다. 그래서 여기서 만든
 * 캔버스를 소스 텍스처로 쓰고, 효과는 렌더러들이 픽셀 합성만으로 처리한다.
 *
 * ## 왜 클래스명으로 폰트를 지정할 수 없는가
 * `<img>` 로 올린 SVG 는 메인 문서와 격리된 문서로 렌더된다. 페이지의 CSS 가 닿지 않으므로
 * `font-pretendard` 같은 클래스는 아무 효과가 없고, `@font-face` 로 등록된 웹폰트도
 * **외부 리소스라 아예 받지 않는다.** 폰트를 확정하는 방법은 `@font-face` 를 data URI 로
 * SVG 안에 인라인하는 것뿐이다. ( `wordmarkFont.ts` 참고 )
 */

// region [Constants]
/** 워드마크 글자. */
const WORDMARK_TEXT = "BITCOIN";

/**
 * 박스 높이 대비 대문자 높이의 목표 비율.
 *
 * 폰트 크기를 박스 높이로 자르면 안 된다. 워드마크는 대문자만 쓰므로 어센더·디센더 공간이
 * 통째로 비고 실제로 보이는 높이는 폰트 크기의 0.72~0.74배뿐이다. 그대로 자르면 기존 로고보다
 * 눈에 띄게 커 보인다. 보이는 높이를 기준으로 역산해야 기존 로고와 무게가 맞는다.
 */
const WORDMARK_TARGET_CAP_HEIGHT_RATIO = 0.74;

/** 채널 분리가 박스 밖으로 삐져나가 잘리지 않도록 캔버스 네 변에 두는 여유(CSS px). */
export const BAKE_PADDING_IN_CSS_PX = 12;

/** 디바이스 픽셀 비율 상한. 3을 넘기면 캔버스 메모리만 늘고 눈에 보이는 차이가 없다. */
const MAX_PIXEL_RATIO = 3;

/**
 * 굽기 시도 횟수.
 *
 * iOS Safari 는 `<img>` 의 `onload` 가 발생한 뒤에도 `<foreignObject>` 안의 텍스트를
 * 아직 래스터화하지 않아, 첫 시도에서 **투명한 빈 이미지**가 그려지는 일이 있다.
 * ( 공유 카드가 iOS 에서 처음 한 번 비어 나왔던 것과 같은 증상 )
 * 그래서 그린 결과가 비었는지 직접 확인하고 한 번 더 시도한다.
 */
const MAX_BAKE_ATTEMPT_COUNT = 2;

/** 빈 래스터 판정을 위해 세로로 훑어볼 가로 띠의 개수. */
const BLANK_CHECK_BAND_COUNT = 7;
// endregion

// region [Types]
export interface BakedHtmlCanvas {
  canvas: HTMLCanvasElement;
  widthInDevicePx: number;
  heightInDevicePx: number;
  pixelRatio: number;
}

export interface BakeHtmlOptions {
  /**
   * `<foreignObject>` 루트 `<div>` 안에 들어갈 마크업.
   *
   * **XML 로 파싱된다.** 모든 태그를 닫아야 하고( `<br />` ), `&` 는 `&amp;` 로 써야 한다.
   */
  innerHtmlMarkup: string;
  /**
   * 루트 `<div>` 에 적용할 CSS 선언 문자열( 세미콜론 구분 ).
   *
   * **큰따옴표를 쓰면 안 된다.** `style="..."` 속성 값으로 들어가므로 큰따옴표가 나오는 순간
   * XML 속성이 종료되고 SVG 전체가 파싱 에러가 된다. 폰트 이름은 작은따옴표로 감쌀 것.
   */
  rootStyleDeclaration: string;
  /** `loadInlinedFontFace` 가 만든 인라인 `@font-face` CSS. */
  fontFaceCss: string;
  widthInCssPx: number;
  heightInCssPx: number;
  /** 효과가 박스 밖으로 번질 여유. 기본 `BAKE_PADDING_IN_CSS_PX`. */
  paddingInCssPx?: number;
}

export interface BakedWordmark {
  /** 본체( 지정 색 ) 텍스처. */
  baseCanvas: HTMLCanvasElement;
  /** 알파를 유지한 시안 실루엣. 채널 분리의 왼쪽 레이어. */
  cyanCanvas: HTMLCanvasElement;
  /** 알파를 유지한 마젠타 실루엣. 채널 분리의 오른쪽 레이어. */
  magentaCanvas: HTMLCanvasElement;
  widthInDevicePx: number;
  heightInDevicePx: number;
  pixelRatio: number;
}

export interface BakeWordmarkOptions {
  widthInCssPx: number;
  heightInCssPx: number;
  /** 본체 색. */
  fillColor: string;
  /** 쓸 폰트. */
  fontId: WordmarkFontId;
}
// endregion

// region [Privates]
/** 현재 디바이스의 픽셀 비율을 상한 안으로 잘라 반환한다. */
export function resolvePixelRatio(): number {
  if (typeof window === "undefined") {
    return 1;
  }
  return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
}

/**
 * `<foreignObject>` SVG 마크업을 만든다.
 *
 * SVG 는 XML 이라 `<div>` 에 XHTML 네임스페이스를 명시해야 파싱된다. 빠뜨리면
 * `<img>` 가 `onerror` 없이 **빈 이미지**로 조용히 로드되어 디버깅이 매우 괴로워진다.
 */
function buildForeignObjectSvgMarkup(
  widthInDevicePx: number,
  heightInDevicePx: number,
  rootStyleDeclaration: string,
  innerHtmlMarkup: string,
  fontFaceCss: string,
): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthInDevicePx}" height="${heightInDevicePx}">`,
    `<style>${fontFaceCss}</style>`,
    `<foreignObject x="0" y="0" width="${widthInDevicePx}" height="${heightInDevicePx}">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${rootStyleDeclaration}">${innerHtmlMarkup}</div>`,
    "</foreignObject>",
    "</svg>",
  ].join("");
}

/** SVG 마크업을 data URI 로 올려 디코드가 끝난 `<img>` 를 반환한다. */
function decodeSvgMarkupToImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(
        new Error("SVG 를 이미지로 디코드하지 못했습니다. XML 파싱 오류일 가능성이 높습니다."),
      );
    };

    /*
     * `btoa` 로 SVG 전체를 base64 하지 않고 `encodeURIComponent` 를 쓴다.
     * 폰트가 이미 base64 라 전체를 다시 base64 하면 길이가 33% 더 늘어난다.
     */
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });
}

/**
 * 캔버스에 불투명한 픽셀이 하나라도 있는지 본다.
 *
 * 전체 `getImageData` 는 수십만 픽셀을 CPU 로 옮기므로, 세로로 균등하게 나눈 몇 줄만 읽는다.
 * 한 줄이 아니라 여러 줄을 보는 이유는 PGP 블록처럼 중간에 빈 줄이 있는 조판 때문이다.
 * 가운데 한 줄만 보면 멀쩡히 그려진 것을 빈 이미지로 오판한다.
 */
function hasOpaquePixels(
  context: CanvasRenderingContext2D,
  widthInDevicePx: number,
  heightInDevicePx: number,
): boolean {
  for (let bandIndex = 1; bandIndex <= BLANK_CHECK_BAND_COUNT; bandIndex += 1) {
    const bandTopInDevicePx = Math.min(
      heightInDevicePx - 1,
      Math.floor((heightInDevicePx * bandIndex) / (BLANK_CHECK_BAND_COUNT + 1)),
    );
    const { data } = context.getImageData(0, bandTopInDevicePx, widthInDevicePx, 1);

    // RGBA 4바이트 중 알파만 본다.
    for (let alphaIndex = 3; alphaIndex < data.length; alphaIndex += 4) {
      if (data[alphaIndex] > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * SVG 를 그리고, 결과가 비어 있으면 한 번 더 시도한다.
 *
 * `decodeSvgMarkupToImage` 를 매 시도마다 새로 호출하는 것이 중요하다. 같은 `<img>` 를
 * 다시 그려도 래스터 캐시가 그대로라 빈 이미지가 또 나온다.
 */
async function drawSvgWithRetry(
  context: CanvasRenderingContext2D,
  svgMarkup: string,
  widthInDevicePx: number,
  heightInDevicePx: number,
): Promise<void> {
  for (let attemptCount = 0; attemptCount < MAX_BAKE_ATTEMPT_COUNT; attemptCount += 1) {
    const bakedImage = await decodeSvgMarkupToImage(svgMarkup);

    context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
    context.drawImage(bakedImage, 0, 0, widthInDevicePx, heightInDevicePx);

    if (hasOpaquePixels(context, widthInDevicePx, heightInDevicePx)) {
      return;
    }
  }

  throw new Error("내용이 빈 이미지로 래스터화되었습니다.");
}

/**
 * 원본의 알파를 유지한 단색 실루엣 캔버스를 만든다.
 *
 * `source-in` 으로 채우면 글리프 모양( 알파 )만 남고 색이 전부 지정색으로 치환된다.
 * 채널 분리 레이어는 이 실루엣을 좌우로 밀어 가산 합성한 것이다.
 */
function createTintedSilhouetteCanvas(
  sourceCanvas: HTMLCanvasElement,
  tintColor: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("실루엣 캔버스 컨텍스트를 만들지 못했습니다.");
  }

  context.drawImage(sourceCanvas, 0, 0);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = tintColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}
// endregion

// region [Transactions]
/**
 * 임의의 HTML 을 캔버스에 구워 반환한다.
 *
 * 크기는 CSS px 이 아니라 **디바이스 픽셀 기준**으로 SVG 를 직접 짠다. `drawImage` 의 확대
 * 리샘플링에 선명도를 의존하지 않기 위함이다. 그래서 호출자가 넘기는 CSS 안의 `px` 값도
 * `pixelRatio` 를 곱해 둬야 한다 — `bakeWordmarkCanvas` 가 폰트 크기에 그렇게 하고 있다.
 */
export async function bakeHtmlToCanvas({
  innerHtmlMarkup,
  rootStyleDeclaration,
  fontFaceCss,
  widthInCssPx,
  heightInCssPx,
  paddingInCssPx = BAKE_PADDING_IN_CSS_PX,
}: BakeHtmlOptions): Promise<BakedHtmlCanvas> {
  const pixelRatio = resolvePixelRatio();
  const widthInDevicePx = Math.round((widthInCssPx + paddingInCssPx * 2) * pixelRatio);
  const heightInDevicePx = Math.round((heightInCssPx + paddingInCssPx * 2) * pixelRatio);

  const svgMarkup = buildForeignObjectSvgMarkup(
    widthInDevicePx,
    heightInDevicePx,
    rootStyleDeclaration,
    innerHtmlMarkup,
    fontFaceCss,
  );

  const canvas = document.createElement("canvas");
  canvas.width = widthInDevicePx;
  canvas.height = heightInDevicePx;

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("캔버스 컨텍스트를 만들지 못했습니다.");
  }

  await drawSvgWithRetry(context, svgMarkup, widthInDevicePx, heightInDevicePx);

  return { canvas, widthInDevicePx, heightInDevicePx, pixelRatio };
}

/**
 * 주어진 박스 크기에 맞춰 워드마크를 구워 본체·시안·마젠타 텍스처를 반환한다.
 *
 * 반환된 캔버스는 불변으로 다루고, 프레임마다 새로 굽지 않는다.
 */
export async function bakeWordmarkCanvas({
  widthInCssPx,
  heightInCssPx,
  fillColor,
  fontId,
}: BakeWordmarkOptions): Promise<BakedWordmark> {
  const fontSpec = WORDMARK_FONTS[fontId];
  const pixelRatio = resolvePixelRatio();

  const [{ fontFaceCss, bakedFamilyName }, fontMetrics] = await Promise.all([
    loadInlinedFontFace(fontSpec),
    measureWordmarkFontMetrics(fontSpec, WORDMARK_TEXT),
  ]);

  /*
   * 폭으로도, 보이는 높이로도 넘치지 않는 폰트 크기를 고른다.
   *
   * CSS `letter-spacing` 은 **마지막 글자 뒤에도** 붙으므로 글자 수만큼 더해진다.
   * 측정한 advance 는 자간이 없는 값이라 여기서 따로 보태야 한다.
   */
  const advanceWithLetterSpacingInEm =
    fontMetrics.advanceInEm + WORDMARK_TEXT.length * fontSpec.letterSpacingInEm;
  const fontSizeFittingWidthInCssPx = widthInCssPx / advanceWithLetterSpacingInEm;
  const fontSizeFittingCapHeightInCssPx =
    (heightInCssPx * WORDMARK_TARGET_CAP_HEIGHT_RATIO) / fontMetrics.capHeightInEm;
  const fontSizeInCssPx = Math.min(fontSizeFittingWidthInCssPx, fontSizeFittingCapHeightInCssPx);

  const rootStyleDeclaration = [
    "width:100%",
    "height:100%",
    "margin:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    /*
     * 폰트 이름은 **작은따옴표**로 감싼다.
     *
     * 이 문자열은 `style="..."` 속성 값으로 들어가는데, 큰따옴표를 쓰면 그 지점에서 XML
     * 속성이 종료돼 SVG 전체가 파싱 에러가 된다. 그러면 `<img>` 는 `onerror` 로 떨어지고
     * 워드마크가 통째로 폴백된다. CSS 는 작은따옴표도 똑같이 받아들인다.
     */
    `font-family:'${bakedFamilyName}',monospace`,
    `font-weight:${fontSpec.weight}`,
    `font-size:${fontSizeInCssPx * pixelRatio}px`,
    "line-height:1",
    `letter-spacing:${fontSpec.letterSpacingInEm}em`,
    "white-space:pre",
    `color:${fillColor}`,
    "-webkit-font-smoothing:antialiased",
  ].join(";");

  const { canvas, widthInDevicePx, heightInDevicePx } = await bakeHtmlToCanvas({
    innerHtmlMarkup: WORDMARK_TEXT,
    rootStyleDeclaration,
    fontFaceCss,
    widthInCssPx,
    heightInCssPx,
  });

  return {
    baseCanvas: canvas,
    cyanCanvas: createTintedSilhouetteCanvas(canvas, CHANNEL_CYAN_COLOR),
    magentaCanvas: createTintedSilhouetteCanvas(canvas, CHANNEL_MAGENTA_COLOR),
    widthInDevicePx,
    heightInDevicePx,
    pixelRatio,
  };
}
// endregion
