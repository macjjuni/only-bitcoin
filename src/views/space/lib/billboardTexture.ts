import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 전광판 캔버스 텍스처.
 *
 * 숫자는 `drei` 의 SDF 텍스트가 아니라 캔버스로 그린다. 폰트 아틀라스를 추가로
 * 받지 않고 LED 그릴 질감을 셰이더 없이 낼 수 있다. 근거는
 * `docs/btc-space-3d.md` §6 에 있다.
 */

export const BILLBOARD_TEXTURE = {
  width: 1024,
  height: 512,
  /** 텍스처 재업로드 간격 상한. 시세는 초당 수십 번 바뀐다. */
  minRedrawIntervalMs: 250,
  /** LED 그릴 간격(px). */
  gridPitch: 6,
  paddingX: 48,
  /** 연결 표시 점이 차지하는 좌우 영역. 라벨이 점을 덮지 않게 한다. */
  statusDotZoneX: 96,
} as const;

/**
 * 글자 크기 하한.
 *
 * 패널 폭 12 m 가 텍스처 1024 px 에 대응하므로 1 px 는 11.7 mm 다. 72 px 글자의
 * 숫자 높이는 약 0.6 m 이고, 32 m 거리에서 약 65 arcmin 로 가독 한계(약 5 arcmin)의
 * 13배다. 이 밑으로 내려갈 일은 없지만 계산이 틀렸을 때의 안전장치로 둔다.
 */
export const BILLBOARD_MIN_FONT_SIZE_PX = 72;

export const BILLBOARD_COLORS = {
  background: "#06080e",
  panelEdge: "#1b2432",
  grid: "#020306",
  label: "#7c8699",
  price: BITCOIN_COLOR,
  subPrice: "#e4e9f2",
  up: "#22c55e",
  down: "#ef4444",
  flat: "#7c8699",
  offline: "#ef4444",
  online: "#22c55e",
} as const;

/** 값이 아직 없을 때 표시할 자리. 스토어는 0 으로 시작한다. */
export const BILLBOARD_PLACEHOLDER = "—";

export type BillboardTone = "up" | "down" | "flat";

export interface BillboardState {
  krw: number;
  usd: number;
  krwChange24h: string;
  usdChange24h: string;
  isKrwConnected: boolean;
  isUsdConnected: boolean;
}

const KRW_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const USD_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// region [Privates]
/** 시세는 스토어 초기값이 0 이므로 0 과 비유한 값을 모두 미표시로 본다. */
const isDisplayablePrice = (price: number): boolean => {
  return Number.isFinite(price) && price > 0;
};

const parseChange = (change: string | number): number | null => {
  const parsed = typeof change === "number" ? change : Number.parseFloat(change);
  return Number.isFinite(parsed) ? parsed : null;
};
// endregion

export const formatBillboardKrw = (price: number): string => {
  return isDisplayablePrice(price) ? `₩${KRW_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

export const formatBillboardUsd = (price: number): string => {
  return isDisplayablePrice(price) ? `$${USD_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

/** 소수 두 자리로 고정한다. 자리수가 흔들리면 4 Hz 갱신 때 글자가 떤다. */
export const formatBillboardChange = (change: string | number): string => {
  const parsed = parseChange(change);

  if (parsed === null) {
    return BILLBOARD_PLACEHOLDER;
  }
  if (parsed === 0) {
    return "0.00%";
  }

  return `${parsed > 0 ? "+" : "-"}${Math.abs(parsed).toFixed(2)}%`;
};

export const resolveChangeTone = (change: string | number): BillboardTone => {
  const parsed = parseChange(change);

  if (parsed === null || parsed === 0) {
    return "flat";
  }

  return parsed > 0 ? "up" : "down";
};

export const resolveToneColor = (tone: BillboardTone): string => {
  return BILLBOARD_COLORS[tone];
};

export interface TextFitOptions {
  maxWidth: number;
  maxFontSizePx: number;
  minFontSizePx?: number;
}

/**
 * 가용 폭에 맞춰 글자 크기를 줄인다.
 *
 * 캔버스 텍스트 폭은 글자 크기에 선형이므로, 최대 크기에서 한 번 재고 비율만
 * 곱하면 된다. 크기를 1 px 씩 줄이며 반복 측정할 필요가 없다.
 *
 * 자리수가 늘어나도(가격이 10자리가 되어도) 넘치지 않게 하려고 둔다. 고정
 * 크기로 두면 `₩158,420,000` 같은 12자 문자열이 패널 밖으로 282 px 넘친다.
 *
 * @param measuredWidth 최대 글자 크기로 측정한 문자열 폭
 */
export const resolveFittedFontSize = (
  measuredWidth: number,
  { maxWidth, maxFontSizePx, minFontSizePx = BILLBOARD_MIN_FONT_SIZE_PX }: TextFitOptions,
): number => {
  if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
    return maxFontSizePx;
  }

  const shrinkRatio = Math.min(1, maxWidth / measuredWidth);

  return Math.max(Math.min(minFontSizePx, maxFontSizePx), Math.floor(maxFontSizePx * shrinkRatio));
};

// region [Privates]
const drawPanelBackground = (context: CanvasRenderingContext2D): void => {
  const { width, height } = BILLBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = BILLBOARD_COLORS.panelEdge;
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);
};

/** 글자 위에 어두운 격자를 덮어 LED 그릴처럼 보이게 한다. */
const drawLedGrid = (context: CanvasRenderingContext2D): void => {
  const { width, height, gridPitch } = BILLBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.grid;

  for (let x = 0; x < width; x += gridPitch) {
    context.fillRect(x, 0, 2, height);
  }
  for (let y = 0; y < height; y += gridPitch) {
    context.fillRect(0, y, width, 2);
  }
};

const drawConnectionDot = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  isConnected: boolean,
): void => {
  context.beginPath();
  context.arc(x, y, 9, 0, Math.PI * 2);
  context.fillStyle = isConnected ? BILLBOARD_COLORS.online : BILLBOARD_COLORS.offline;
  context.fill();
};
// endregion

/** 등폭 스택. 자리수마다 폭이 달라지면 4 Hz 갱신 때 글자가 떤다. */
const MONOSPACE_FONT_STACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

// region [Privates]
const resolveFontSpec = (fontWeight: number, fontSizePx: number): string => {
  return `${fontWeight} ${fontSizePx}px ${MONOSPACE_FONT_STACK}`;
};

/** 가용 폭을 넘지 않도록 크기를 줄여 가운데 정렬로 그린다. */
const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  {
    fontWeight,
    maxFontSizePx,
    maxWidth,
    centerY,
  }: {
    fontWeight: number;
    maxFontSizePx: number;
    maxWidth: number;
    centerY: number;
  },
): void => {
  context.font = resolveFontSpec(fontWeight, maxFontSizePx);

  const fittedFontSize = resolveFittedFontSize(context.measureText(text).width, {
    maxWidth,
    maxFontSizePx,
  });

  if (fittedFontSize !== maxFontSizePx) {
    context.font = resolveFontSpec(fontWeight, fittedFontSize);
  }

  context.fillText(text, BILLBOARD_TEXTURE.width / 2, centerY);
};
// endregion

/**
 * 전광판 한 장을 그린다.
 *
 * 모든 행은 가용 폭에 맞춰 자동으로 줄어든다. 고정 크기로 두면 가격 자리수가
 * 늘어나는 순간 패널 밖으로 넘친다.
 */
export const drawBillboard = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  const { width, paddingX, statusDotZoneX } = BILLBOARD_TEXTURE;
  const contentWidth = width - paddingX * 2;
  const labelWidth = width - statusDotZoneX * 2;

  drawPanelBackground(context);
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  drawFittedText(context, "BITCOIN", {
    fontWeight: 600,
    maxFontSizePx: 40,
    maxWidth: labelWidth,
    centerY: 74,
  });

  context.fillStyle = BILLBOARD_COLORS.price;
  drawFittedText(context, formatBillboardKrw(state.krw), {
    fontWeight: 700,
    maxFontSizePx: 168,
    maxWidth: contentWidth,
    centerY: 214,
  });

  context.fillStyle = BILLBOARD_COLORS.subPrice;
  drawFittedText(context, formatBillboardUsd(state.usd), {
    fontWeight: 600,
    maxFontSizePx: 84,
    maxWidth: contentWidth,
    centerY: 348,
  });

  context.fillStyle = resolveToneColor(resolveChangeTone(state.krwChange24h));
  drawFittedText(context, `24H ${formatBillboardChange(state.krwChange24h)}`, {
    fontWeight: 700,
    maxFontSizePx: 76,
    maxWidth: contentWidth,
    centerY: 444,
  });

  drawConnectionDot(context, 44, 74, state.isKrwConnected);
  drawConnectionDot(context, width - 44, 74, state.isUsdConnected);

  drawLedGrid(context);
};
