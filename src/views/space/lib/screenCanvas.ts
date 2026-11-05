import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 메인 전광판 두 칸(시세·네트워크)이 같이 쓰는 캔버스 규격과 그리기 도구.
 *
 * 액자 하나를 반씩 나눠 쓰는 두 판이라 팔레트·카드·글꼴이 하나라도 다르면
 * 벽이 두 개로 쪼개져 보임. 그래서 공용 값은 전부 여기서만 정함.
 */

/**
 * 텍스처 규격. 액자 반쪽(14 × 10.5 m)과 같은 4:3 임.
 *
 * 1 m 당 약 114 px 라 36 px 글자가 0.3 m 높이가 됨. 라운지 건너편(약 30 m)에서도
 * 넉넉히 읽힘.
 */
export const SCREEN_TEXTURE = {
  width: 1600,
  height: 1200,
  /** 카드 안쪽 좌우 여백. */
  paddingX: 84,
} as const;

/** 카드 테두리 자리. 두 칸이 맞닿을 때 사이에 어두운 틈이 생기게 안으로 들였음. */
export const SCREEN_CARD = {
  inset: 20,
  radius: 28,
  borderWidth: 3,
} as const;

/** 시안(`assets/screen_A.png`)의 따뜻한 카페 톤을 옮겼음. */
export const SCREEN_COLORS = {
  backdrop: "#0b0704",
  cardTop: "#21150b",
  cardBottom: "#130c06",
  cardBorder: "#5b3f1d",
  divider: "#33241499",
  grid: "#3a2a17",
  label: "#f3e8d8",
  labelMuted: "#a8927a",
  labelDim: "#6f5d48",
  surface: "#2b1d10",
  brand: BITCOIN_COLOR,
  /** 강조 배경 위에 얹는 어두운 글자. */
  onAccent: "#160d05",
  up: "#5fd68c",
  down: "#ef5f4f",
  flat: "#a8927a",
  online: "#5fd68c",
  offline: "#ef5f4f",
  segmentEmpty: "#3a2a17",
} as const;

/** 본문용 산세리프. 한글 라벨이 들어가므로 시스템 폰트를 그대로 씀. */
export const SANS_FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

/**
 * 숫자용 등폭. 자리수마다 폭이 달라지면 4 Hz 갱신 때 글자가 떰.
 *
 * 앱에 번들된 JetBrains Mono 를 먼저 씀. 시안의 숫자 글꼴과 가장 가까움.
 */
export const NUMERIC_FONT_STACK =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/** 캔버스는 웹폰트를 기다려 주지 않아서 먼저 받아 둘 글꼴 목록. */
const SCREEN_FONT_FACES = ['800 100px "JetBrains Mono"', '700 100px "JetBrains Mono"'] as const;

/**
 * 글자 크기 하한.
 *
 * 패널 폭 14 m 가 텍스처 1600 px 에 대응하므로 1 px 는 8.75 mm 임. 계산이 틀렸을 때
 * 숫자가 점처럼 줄어드는 것을 막는 안전장치로 둠.
 */
export const SCREEN_MIN_FONT_SIZE_PX = 28;

export interface TextFitOptions {
  maxWidth: number;
  maxFontSizePx: number;
  minFontSizePx?: number;
}

export const resolveFontSpec = (
  fontWeight: number,
  fontSizePx: number,
  fontStack: string,
): string => {
  return `${fontWeight} ${fontSizePx}px ${fontStack}`;
};

/**
 * 가용 폭에 맞춰 글자 크기를 줄인다.
 *
 * 캔버스 텍스트 폭은 글자 크기에 선형이므로, 최대 크기에서 한 번 재고 비율만
 * 곱하면 됨. 가격이 열 자리가 되어도 옆 칸을 침범하지 않게 하려고 둠.
 *
 * @param measuredWidth 최대 글자 크기로 측정한 문자열 폭
 */
export const resolveFittedFontSize = (
  measuredWidth: number,
  { maxWidth, maxFontSizePx, minFontSizePx = SCREEN_MIN_FONT_SIZE_PX }: TextFitOptions,
): number => {
  if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
    return maxFontSizePx;
  }

  const shrinkRatio = Math.min(1, maxWidth / measuredWidth);

  return Math.max(Math.min(minFontSizePx, maxFontSizePx), Math.floor(maxFontSizePx * shrinkRatio));
};

/** 가용 폭을 넘지 않도록 크기를 줄여 그린다. 그린 폭을 돌려줌. */
export const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    x: number;
    y: number;
    fontWeight: number;
    maxFontSizePx: number;
    maxWidth: number;
    fontStack: string;
    minFontSizePx?: number;
  },
): number => {
  const { x, y, fontWeight, maxFontSizePx, maxWidth, fontStack, minFontSizePx } = options;

  context.font = resolveFontSpec(fontWeight, maxFontSizePx, fontStack);

  const fittedFontSize = resolveFittedFontSize(context.measureText(text).width, {
    maxWidth,
    maxFontSizePx,
    minFontSizePx,
  });

  if (fittedFontSize !== maxFontSizePx) {
    context.font = resolveFontSpec(fontWeight, fittedFontSize, fontStack);
  }

  context.fillText(text, x, y);

  return context.measureText(text).width;
};

/** 바깥 어두운 틈 + 둥근 카드 + 금빛 테두리. 두 칸이 같은 함수로 그림. */
export const drawScreenCard = (context: CanvasRenderingContext2D): void => {
  const { width, height } = SCREEN_TEXTURE;
  const { inset, radius, borderWidth } = SCREEN_CARD;
  const gradient = context.createLinearGradient(0, inset, 0, height - inset);
  gradient.addColorStop(0, SCREEN_COLORS.cardTop);
  gradient.addColorStop(1, SCREEN_COLORS.cardBottom);

  context.fillStyle = SCREEN_COLORS.backdrop;
  context.fillRect(0, 0, width, height);

  context.beginPath();
  context.roundRect(inset, inset, width - inset * 2, height - inset * 2, radius);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = SCREEN_COLORS.cardBorder;
  context.lineWidth = borderWidth;
  context.stroke();
};

/** 카드 폭을 가로지르는 얇은 구분선. */
export const drawScreenDivider = (context: CanvasRenderingContext2D, y: number): void => {
  context.beginPath();
  context.moveTo(SCREEN_TEXTURE.paddingX, y);
  context.lineTo(SCREEN_TEXTURE.width - SCREEN_TEXTURE.paddingX, y);
  context.strokeStyle = SCREEN_COLORS.divider;
  context.lineWidth = 2;
  context.stroke();
};

/**
 * 캔버스용 웹폰트를 미리 받는다.
 *
 * 받기 전에 그리면 대체 글꼴로 구워진 채 텍스처가 남음. 끝나면 `true` 라
 * 호출부가 한 번 다시 그리면 됨. 폰트 API 가 없는 환경은 바로 `false`.
 */
export const loadScreenFonts = async (): Promise<boolean> => {
  if (typeof document === "undefined" || !document.fonts) {
    return false;
  }

  try {
    await Promise.all(SCREEN_FONT_FACES.map((fontFace) => document.fonts.load(fontFace)));
    return true;
  } catch {
    return false;
  }
};

/** BTC 총량. 공급량 표시와 시가총액 계산에 씀. */
export const BTC_MAX_SUPPLY = 21_000_000;

/** 달러 금액을 `$2.07T`, `$38.2B` 처럼 줄인다. */
export const formatCompactUsd = (value: number): string | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  }
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }

  return `$${Math.round(value).toLocaleString("en-US")}`;
};
