/**
 * 워드마크를 구울 때 쓸 폰트의 해석·측정·인라인을 담당하는 모듈.
 *
 * ## 왜 폰트 URL 을 하드코딩하지 않는가
 * Pretendard 는 `kku-ui/index.css` 가 들고 들어오고, 번들러가 파일명에 해시를 붙여
 * `/_next/static/media/Pretendard-Bold.<해시>.woff2` 로 내보낸다. 빌드마다 해시가 바뀌므로
 * 경로를 코드에 박을 수 없다. 그래서 살아 있는 CSSOM 에서 `@font-face` 규칙을 찾아 URL 을 읽는다.
 *
 * ## 왜 `local()` 을 믿으면 안 되는가
 * Pretendard 의 `@font-face` 는 `local("Pretendard Bold")` 가 먼저 오고 번들 woff2 가 뒤에 온다.
 * `<foreignObject>` 는 격리된 문서라 웹폰트를 못 받지만 **OS 에 설치된 폰트는 받는다.**
 * 그래서 Pretendard 가 설치된 기기( 개발자 맥 )에서는 인라인 없이도 멀쩡히 그려지고,
 * 설치 안 된 방문자 기기에서만 폴백된다. 로고가 기기마다 달라지는 최악의 버그라,
 * 설치 여부와 무관하게 같은 결과가 나오도록 **항상 인라인한다.**
 */

// region [Types]
export type WordmarkFontId = "pretendard" | "jetbrains";

export interface WordmarkFontSpec {
  id: WordmarkFontId;
  label: string;
  /** 문서에 등록된 `@font-face` 의 family 이름. 번들 URL 과 메트릭을 이 이름으로 찾는다. */
  familyName: string;
  weight: number;
  /**
   * 자간(em).
   *
   * 등폭 폰트는 글자 advance 가 0.6em 으로 고정이라 비례 폰트보다 넓게 퍼진다. 같은 박스에
   * 넣으면 폭 제한에 먼저 걸려 글자가 작아지므로 음수로 조인다. 비례 폰트는 조일 필요가 없다.
   */
  letterSpacingInEm: number;
  /** CSSOM 에서 URL 을 못 찾았을 때 쓸 경로. 프로젝트가 직접 들고 있는 폰트만 지정한다. */
  fallbackWoff2Path: string | null;
}

export interface WordmarkFontMetrics {
  /** 워드마크 전체 폭 / 폰트 크기 비율(em). */
  advanceInEm: number;
  /** 대문자 높이 / 폰트 크기 비율(em). */
  capHeightInEm: number;
}

export interface InlinedFontFace {
  /** SVG 에 넣을 `@font-face` CSS. */
  fontFaceCss: string;
  /**
   * SVG 안에서 쓸 family 이름.
   *
   * 원래 이름을 그대로 쓰면 `local()` 로 설치본이 잡힐 여지가 남는다. 전용 별칭을 쓰면
   * 인라인한 바이트 외에는 매칭될 수 없어 결과가 기기와 무관하게 고정된다.
   */
  bakedFamilyName: string;
}
// endregion

// region [Constants]
export const WORDMARK_FONTS: Record<WordmarkFontId, WordmarkFontSpec> = {
  pretendard: {
    id: "pretendard",
    label: "Pretendard",
    familyName: "Pretendard",
    weight: 700,
    letterSpacingInEm: 0,
    fallbackWoff2Path: null,
  },
  jetbrains: {
    id: "jetbrains",
    label: "JetBrains Mono",
    familyName: "JetBrains Mono",
    weight: 700,
    letterSpacingInEm: -0.05,
    fallbackWoff2Path: "/font/jetbrain-mono/JetBrainsMono-Bold.woff2",
  },
};
// endregion

// region [Privates]
/**
 * 문서의 `@font-face` 규칙에서 지정 family·weight 의 woff2 URL 을 찾는다.
 *
 * 다른 오리진에서 온 스타일시트는 `cssRules` 접근이 막히므로 건너뛴다. 상대 경로는
 * 그 규칙이 들어 있던 스타일시트를 기준으로 풀어야 한다 — 문서 기준으로 풀면 틀린다.
 */
function findBundledFontUrl(spec: WordmarkFontSpec): string | null {
  for (const styleSheet of document.styleSheets) {
    let cssRules: CSSRuleList;

    try {
      cssRules = styleSheet.cssRules;
    } catch {
      continue;
    }

    for (const cssRule of cssRules) {
      if (!(cssRule instanceof CSSFontFaceRule)) {
        continue;
      }

      const ruleFamilyName = cssRule.style.fontFamily.replace(/["']/g, "").trim();

      if (ruleFamilyName.toLowerCase() !== spec.familyName.toLowerCase()) {
        continue;
      }
      if (String(cssRule.style.fontWeight) !== String(spec.weight)) {
        continue;
      }

      // `src` 는 `CSSStyleDeclaration` 에 타입이 없는 @font-face 전용 서술자라 속성명으로 읽는다.
      const fontSrcDeclaration = cssRule.style.getPropertyValue("src");
      const urlMatch = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(fontSrcDeclaration);

      if (urlMatch !== null) {
        return new URL(urlMatch[1], styleSheet.href ?? window.location.href).href;
      }
    }
  }

  return spec.fallbackWoff2Path;
}

/**
 * ArrayBuffer 를 base64 문자열로 바꾼다.
 *
 * `String.fromCharCode(...bytes)` 를 한 번에 쓰면 200KB 넘는 폰트에서 인자 개수 한계로
 * 스택이 터진다. 32KB 씩 끊어서 이어 붙인다.
 */
function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE_IN_BYTES = 0x8000;
  let binaryString = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE_IN_BYTES) {
    binaryString += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE_IN_BYTES));
  }

  return window.btoa(binaryString);
}
// endregion

// region [Transactions]
/**
 * 폰트를 base64 로 인라인한 `@font-face` CSS 를 만든다.
 *
 * Pretendard Bold 는 223KB 라 base64 로 298KB 가 된다. 폰트당 한 번만 받아 모듈 스코프에
 * 캐시하므로 시안이 몇 개든 네트워크 요청과 인코딩은 폰트당 1회로 끝난다.
 * ( 브라우저는 이미 같은 파일을 받아 뒀으므로 이 fetch 는 보통 캐시에서 떨어진다 )
 */
const inlinedFontFacePromiseByID = new Map<WordmarkFontId, Promise<InlinedFontFace>>();

export function loadInlinedFontFace(spec: WordmarkFontSpec): Promise<InlinedFontFace> {
  const cachedPromise = inlinedFontFacePromiseByID.get(spec.id);

  if (cachedPromise !== undefined) {
    return cachedPromise;
  }

  const inlinedFontFacePromise = (async (): Promise<InlinedFontFace> => {
    const fontUrl = findBundledFontUrl(spec);

    if (fontUrl === null) {
      throw new Error(`${spec.familyName} 의 woff2 URL 을 찾지 못했습니다.`);
    }

    const response = await fetch(fontUrl);

    if (!response.ok) {
      throw new Error(`${spec.familyName} 폰트를 불러오지 못했습니다: ${fontUrl}`);
    }

    const fontBase64 = encodeArrayBufferToBase64(await response.arrayBuffer());
    const bakedFamilyName = `${spec.familyName} Baked`;

    return {
      bakedFamilyName,
      fontFaceCss: [
        "@font-face{",
        `font-family:"${bakedFamilyName}";`,
        `font-style:normal;font-weight:${spec.weight};font-display:block;`,
        `src:url(data:font/woff2;base64,${fontBase64}) format("woff2");`,
        "}",
      ].join(""),
    };
  })();

  inlinedFontFacePromiseByID.set(spec.id, inlinedFontFacePromise);

  return inlinedFontFacePromise;
}

/**
 * 폰트의 실제 메트릭을 캔버스로 측정한다.
 *
 * advance 와 대문자 높이를 상수로 박아 두면 폰트를 바꿀 때마다 숫자를 다시 조사해야 하고,
 * 비례 폰트에서는 글자 구성이 달라지면 값이 아예 틀린다. `measureText` 는 문서에 로드된
 * 폰트를 그대로 재므로 폰트가 무엇이든 정확하다.
 */
const fontMetricsPromiseByKey = new Map<string, Promise<WordmarkFontMetrics>>();

export function measureWordmarkFontMetrics(
  spec: WordmarkFontSpec,
  wordmarkText: string,
): Promise<WordmarkFontMetrics> {
  const metricsKey = `${spec.id}:${wordmarkText}`;
  const cachedPromise = fontMetricsPromiseByKey.get(metricsKey);

  if (cachedPromise !== undefined) {
    return cachedPromise;
  }

  const metricsPromise = (async (): Promise<WordmarkFontMetrics> => {
    const BASELINE_FONT_SIZE_IN_PX = 100;
    const fontShorthand = `${spec.weight} ${BASELINE_FONT_SIZE_IN_PX}px '${spec.familyName}'`;

    // 측정 전에 문서 폰트 로드를 끝내야 한다. 안 그러면 폴백 폰트를 재게 된다.
    await document.fonts.load(fontShorthand);

    const context = document.createElement("canvas").getContext("2d");

    if (context === null) {
      throw new Error("폰트 측정용 캔버스 컨텍스트를 만들지 못했습니다.");
    }

    context.font = fontShorthand;
    const textMetrics = context.measureText(wordmarkText);

    return {
      advanceInEm: textMetrics.width / BASELINE_FONT_SIZE_IN_PX,
      capHeightInEm: textMetrics.actualBoundingBoxAscent / BASELINE_FONT_SIZE_IN_PX,
    };
  })();

  fontMetricsPromiseByKey.set(metricsKey, metricsPromise);

  return metricsPromise;
}
// endregion
