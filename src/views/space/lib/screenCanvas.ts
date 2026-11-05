import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 메인 전광판 두 칸(시세·네트워크)이 같이 쓰는 캔버스 규격과 그리기 도구.
 *
 * 액자 하나를 반씩 나눠 쓰는 두 판이라 팔레트·여백·글꼴이 하나라도 다르면
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
  /** 패널 안쪽 좌우 여백. */
  paddingX: 84,
} as const;

/** 두 판 사이 이음선. 1 px 가 8.75 mm 라 4 px 면 약 3.5 cm 짜리 얇은 선임. */
export const SCREEN_SEAM = {
  lineWidth: 4,
  /** 위아래 끝까지 긋지 않음. 액자 안쪽 모서리에 선이 닿으면 지저분해 보임. */
  paddingY: 40,
} as const;

/** 시안(`assets/screen_A.png`)의 따뜻한 카페 톤을 옮겼음. */
export const SCREEN_COLORS = {
  backdrop: "#0b0704",
  /** 블록 칸처럼 바탕 위에 한 겹 올리는 면. */
  surfaceDeep: "#130c06",
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
  /** 두 판을 가르는 이음선. 흰색은 너무 튀어서 한 단계 눌린 회색으로 둠. */
  seam: "#5e5e5e",
} as const;

/** 본문용 산세리프. 한글 라벨이 들어가므로 시스템 폰트를 그대로 씀. */
export const SANS_FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

/**
 * 숫자용 등폭. 자리수마다 폭이 달라지면 4 Hz 갱신 때 글자가 떰.
 *
 * 앱 전체 숫자 서체(`font-number` → `--number-font`)와 같은 Roboto Mono 를 씀.
 * 전광판만 다른 글꼴을 쓰면 같은 시세가 화면과 공간에서 달라 보임.
 *
 * 번들에는 300·400·700 만 있어서 아래 800 요청은 700 면으로 매칭됨. `₩`(U+20A9)
 * 글리프가 Roboto Mono 에 없어 원화 기호만 뒤쪽 등폭 폴백으로 그려짐.
 */
export const NUMERIC_FONT_STACK = '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/** 캔버스는 웹폰트를 기다려 주지 않아서 먼저 받아 둘 글꼴 목록. 번들에 있는 두 굵기임. */
const SCREEN_FONT_FACES = ['700 100px "Roboto Mono"', '400 100px "Roboto Mono"'] as const;

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

/**
 * 바탕 한 겹. 두 칸이 같은 함수로 그림.
 *
 * 둥근 카드와 금빛 테두리를 걷어냈음. 맵의 금장 액자가 이미 테두리라 안쪽에
 * 카드가 또 있으면 홈이 두 겹으로 보였고, 맞닿는 두 판 사이에는 선이 두 줄
 * 생겼음. 지금은 어두운 바탕만 깔고 가운데 경계는 `drawScreenSeam` 이 한 줄로 맡음.
 */
export const drawScreenBackdrop = (context: CanvasRenderingContext2D): void => {
  const { width, height } = SCREEN_TEXTURE;

  context.fillStyle = SCREEN_COLORS.backdrop;
  context.fillRect(0, 0, width, height);
};

/**
 * 두 판이 맞닿는 이음선.
 *
 * 카드 테두리를 걷어내니 시세판과 네트워크판이 한 장으로 붙어 보여서 가운데에
 * 선 한 줄을 세웠음. 두 텍스처가 빈틈 없이 맞닿으므로 왼쪽 판만 그려야 한 줄로
 * 보임. 선 전체가 텍스처 안에 들어오게 오른쪽 끝에서 폭만큼 안으로 들였음.
 */
export const drawScreenSeam = (context: CanvasRenderingContext2D): void => {
  const { width, height } = SCREEN_TEXTURE;
  const { lineWidth, paddingY } = SCREEN_SEAM;

  context.fillStyle = SCREEN_COLORS.seam;
  context.fillRect(width - lineWidth, paddingY, lineWidth, height - paddingY * 2);
};

/** 패널 폭을 가로지르는 얇은 구분선. */
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

/**
 * 두 판의 주인공 숫자(시세판 가격, 네트워크판 최신 블록 번호) 글자 크기.
 *
 * 액자 안에 나란히 걸려서 크기가 다르면 한쪽만 튀어 보임. 한 값으로 묶었음.
 */
export const SCREEN_HEADLINE_FONT_SIZE_PX = 120;

/**
 * 우측 상단 상태 배지 자리. 두 판이 같은 자리·같은 모양을 씀.
 *
 * 점의 확산 링은 텍스처가 아니라 `BillboardOnlinePulse` 가 3D 로 겹침. 베이스
 * 텍스처는 상태가 바뀔 때만 다시 올려서 프레임마다 커지는 원을 구울 수 없음.
 */
export const SCREEN_LIVE_BADGE = {
  x: 1316,
  y: 94,
  width: 200,
  height: 64,
  radius: 32,
  /** 점 오른쪽 남은 폭의 가운데. 글자 길이가 달라도 좌우 여백이 맞음. */
  textX: 1446,
  fontSize: 30,
  marker: { x: 1352, y: 126, coreRadius: 10, pulseRadius: 30 },
} as const;

/** `live` 일 때만 점이 퍼짐. 시세판은 끊기면 `offline`, 네트워크판은 블록이 늦으면 `delayed`. */
export type ScreenLiveStatus = "live" | "offline" | "delayed";

const LIVE_BADGE_LABELS: Record<ScreenLiveStatus, string> = {
  live: "LIVE",
  offline: "OFFLINE",
  delayed: "DELAYED",
};

const LIVE_BADGE_COLORS: Record<ScreenLiveStatus, string> = {
  live: SCREEN_COLORS.online,
  offline: SCREEN_COLORS.offline,
  delayed: SCREEN_COLORS.flat,
};

/** 상태 배지. 알약 바탕 + 상태색 점 + 영문 글자. */
export const drawScreenLiveBadge = (
  context: CanvasRenderingContext2D,
  status: ScreenLiveStatus,
): void => {
  const { x, y, width, height, radius, textX, fontSize, marker } = SCREEN_LIVE_BADGE;
  const accentColor = LIVE_BADGE_COLORS[status];

  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = SCREEN_COLORS.surface;
  context.fill();

  context.beginPath();
  context.arc(marker.x, marker.y, marker.coreRadius, 0, Math.PI * 2);
  context.fillStyle = accentColor;
  context.fill();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.font = resolveFontSpec(800, fontSize, NUMERIC_FONT_STACK);
  context.fillText(LIVE_BADGE_LABELS[status], textX, y + height / 2 + 1);
};
