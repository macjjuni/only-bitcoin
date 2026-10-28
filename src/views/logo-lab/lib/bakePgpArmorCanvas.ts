import {
  bakeHtmlToCanvas,
  loadInlinedFontFace,
  resolvePixelRatio,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";
import type { PgpArmorPreset } from "../model/pgpArmorPreset";

/**
 * PGP 아스키 아머 블록을 캔버스에 굽는 모듈.
 *
 * 커서가 켜진 판과 꺼진 판을 각각 구워 두고, 컴포넌트가 둘을 번갈아 그려 깜빡임을 만든다.
 * 커서 위치를 픽셀로 계산해 사각형을 덧그리는 것보다 이쪽이 정확하다 — 줄 높이·자간·폰트
 * 메트릭을 전부 레이아웃 엔진이 이미 계산해 뒀는데 그걸 손으로 다시 맞출 이유가 없다.
 */

/** 아머 본문에 쓰는 등폭 폰트. 아스키 아머는 등폭이 아니면 줄이 안 맞는다. */
const ARMOR_BODY_FONT_ID: WordmarkFontId = "jetbrains";

/** 커서로 쓸 블록 문자. */
const CURSOR_CHARACTER = "█";

export interface BakedPgpArmor {
  /** 커서가 보이는 판. */
  cursorVisibleCanvas: HTMLCanvasElement;
  /** 커서가 숨겨진 판. */
  cursorHiddenCanvas: HTMLCanvasElement;
  widthInDevicePx: number;
  heightInDevicePx: number;
}

// region [Privates]
/**
 * 한 줄을 `<div>` 마크업으로 만든다.
 *
 * **XML 로 파싱되므로** 스타일 값에 큰따옴표를 쓰면 안 되고( 속성이 조기 종료된다 ),
 * 태그를 반드시 닫아야 한다.
 */
function buildLineMarkup(text: string, color: string, fontSizeInDevicePx: number): string {
  const lineStyle = [
    `color:${color}`,
    `font-size:${fontSizeInDevicePx}px`,
    "line-height:1.5",
    "white-space:pre",
  ].join(";");

  return `<div style="${lineStyle}">${text}</div>`;
}
// endregion

// region [Transactions]
/** 프리셋을 커서 on/off 두 판으로 구워 반환한다. */
export async function bakePgpArmorCanvas(
  preset: PgpArmorPreset,
  wordmarkFontId: WordmarkFontId,
): Promise<BakedPgpArmor> {
  const pixelRatio = resolvePixelRatio();
  const bodyFontSizeInDevicePx = preset.bodyFontSizeInCssPx * pixelRatio;
  const wordmarkFontSizeInDevicePx = preset.wordmarkFontSizeInCssPx * pixelRatio;

  /*
   * 본문(등폭)과 워드마크(선택 폰트)가 서로 다른 폰트라 두 개를 모두 인라인한다.
   * 같은 폰트를 고른 경우 `loadInlinedFontFace` 의 캐시가 같은 Promise 를 돌려주므로
   * 네트워크 요청이 중복되지 않는다.
   */
  const [armorBodyFace, wordmarkFace] = await Promise.all([
    loadInlinedFontFace(WORDMARK_FONTS[ARMOR_BODY_FONT_ID]),
    loadInlinedFontFace(WORDMARK_FONTS[wordmarkFontId]),
  ]);

  const rootStyleDeclaration = [
    "width:100%",
    "height:100%",
    "margin:0",
    "display:flex",
    "flex-direction:column",
    "align-items:flex-start",
    "justify-content:center",
    `font-family:'${armorBodyFace.bakedFamilyName}',monospace`,
    "font-weight:700",
    "letter-spacing:0",
    "-webkit-font-smoothing:antialiased",
  ].join(";");

  const wordmarkLineStyle = [
    `color:${preset.wordmarkColor}`,
    `font-family:'${wordmarkFace.bakedFamilyName}',monospace`,
    `font-size:${wordmarkFontSizeInDevicePx}px`,
    "line-height:1.18",
    "white-space:pre",
  ].join(";");

  const buildMarkup = (isCursorVisible: boolean): string => {
    const headerMarkup = preset.headerLines
      .map((line) => buildLineMarkup(line, preset.armorColor, bodyFontSizeInDevicePx))
      .join("");

    const signatureMarkup = preset.signatureLines
      .map((line, lineIndex) => {
        const isArmorBoundaryLine = line.startsWith("-----");
        const lineColor = isArmorBoundaryLine ? preset.armorColor : preset.signatureColor;
        const isLastLine = lineIndex === preset.signatureLines.length - 1;
        // 커서는 마지막 줄 끝에 붙는다. 숨길 때도 같은 자리를 공백으로 채워 줄 폭을 고정한다.
        const cursorSuffix = isLastLine ? (isCursorVisible ? CURSOR_CHARACTER : " ") : "";

        return buildLineMarkup(`${line}${cursorSuffix}`, lineColor, bodyFontSizeInDevicePx);
      })
      .join("");

    return [headerMarkup, `<div style="${wordmarkLineStyle}">BITCOIN</div>`, signatureMarkup].join(
      "",
    );
  };

  const [cursorVisibleBake, cursorHiddenBake] = await Promise.all([
    bakeHtmlToCanvas({
      innerHtmlMarkup: buildMarkup(true),
      rootStyleDeclaration,
      fontFaceCss: `${armorBodyFace.fontFaceCss}${wordmarkFace.fontFaceCss}`,
      widthInCssPx: preset.widthInCssPx,
      heightInCssPx: preset.heightInCssPx,
    }),
    bakeHtmlToCanvas({
      innerHtmlMarkup: buildMarkup(false),
      rootStyleDeclaration,
      fontFaceCss: `${armorBodyFace.fontFaceCss}${wordmarkFace.fontFaceCss}`,
      widthInCssPx: preset.widthInCssPx,
      heightInCssPx: preset.heightInCssPx,
    }),
  ]);

  return {
    cursorVisibleCanvas: cursorVisibleBake.canvas,
    cursorHiddenCanvas: cursorHiddenBake.canvas,
    widthInDevicePx: cursorVisibleBake.widthInDevicePx,
    heightInDevicePx: cursorVisibleBake.heightInDevicePx,
  };
}
// endregion
