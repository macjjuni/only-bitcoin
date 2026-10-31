import { BITCOIN_COLOR } from "@/shared/config/color";
import {
  type ChartRect,
  downsamplePrices,
  resolveChartPoints,
  resolveChartScale,
  resolveTickY,
} from "./billboardChart";

/**
 * 전광판 캔버스 텍스처.
 *
 * 숫자와 차트를 `drei` 의 SDF 텍스트가 아니라 캔버스로 그린다. 한글 라벨
 * (원화·달러·최근 24시간)을 폰트 아틀라스 없이 쓸 수 있고, 차트도 추가
 * 라이브러리 없이 그릴 수 있다. 근거는 `docs/btc-space-3d.md` §6 에 있다.
 */

export const BILLBOARD_TEXTURE = {
  width: 1600,
  height: 900,
  /** 텍스처 재업로드 간격 상한. 시세는 초당 수십 번 바뀐다. */
  minRedrawIntervalMs: 250,
  paddingX: 60,
} as const;

/** 차트에 그릴 최대 점 개수. 288개(5분봉 24시간)를 그대로 그리면 과하다. */
export const BILLBOARD_CHART_MAX_POINTS = 180;

/** 가격·변동률 컬럼의 가용 폭. 이 폭을 넘으면 글자를 줄인다. */
export const BILLBOARD_COLUMNS = {
  priceMaxWidth: 560,
  changeMaxWidth: 240,
} as const;

/**
 * 글자 크기 하한.
 *
 * 패널 폭 12 m 가 텍스처 1600 px 에 대응하므로 1 px 는 7.5 mm 다. 36 px 글자의
 * 숫자 높이는 약 0.19 m 이고, 32 m 거리에서 약 21 arcmin 로 가독 한계(약
 * 5 arcmin)의 4배다. 계산이 틀렸을 때의 안전장치로 둔다.
 */
export const BILLBOARD_MIN_FONT_SIZE_PX = 36;

export const BILLBOARD_COLORS = {
  background: "#0a0f16",
  panelEdge: "#1b2432",
  divider: "#1b2635",
  label: "#e6ecf5",
  labelMuted: "#7d8ba1",
  price: "#ffffff",
  brand: BITCOIN_COLOR,
  up: "#2ee6a8",
  down: "#ef4444",
  flat: "#7d8ba1",
  chartGrid: "#182230",
  chartAxis: "#8d9aad",
  offline: "#ef4444",
  online: "#2ee6a8",
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
  /** 바이낸스 BTCUSDT 5분봉 24시간. 비어 있으면 차트 자리에 안내를 띄운다. */
  usdSeries: readonly number[];
}

const KRW_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const AXIS_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

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

export const formatAxisPrice = (price: number): string => {
  return `$${AXIS_FORMATTER.format(price)}`;
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
 * 자리수가 늘어나도(가격이 10자리가 되어도) 옆 칸을 침범하지 않게 하려고 둔다.
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

/** 본문용 산세리프. 한글 라벨이 들어가므로 시스템 폰트를 그대로 쓴다. */
const SANS_FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
/** 숫자용 등폭. 자리수마다 폭이 달라지면 4 Hz 갱신 때 글자가 떤다. */
const NUMERIC_FONT_STACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** 1600 × 900 기준 레이아웃. 시안(1672 × 941)을 같은 비율로 옮긴 값이다. */
const LAYOUT = {
  logo: { centerX: 93, centerY: 86, radius: 30 },
  title: { x: 150, y: 89, fontSize: 46 },
  ticker: { x: 378, y: 92, fontSize: 31 },
  rows: {
    krw: { centerY: 185, label: "원화", unit: "KRW" },
    usd: { centerY: 304, label: "달러", unit: "USD" },
  },
  rowLabel: { x: 60, fontSize: 36 },
  rowUnit: { x: 145, fontSize: 29 },
  rowPrice: { x: 273, fontSize: 73, maxWidth: BILLBOARD_COLUMNS.priceMaxWidth },
  rowChange: { x: 880, fontSize: 48, maxWidth: BILLBOARD_COLUMNS.changeMaxWidth },
  rowChangeSuffix: { x: 1160, fontSize: 29 },
  dividers: [237, 367] as const,
  chartTitle: { x: 60, y: 423, fontSize: 38 },
  chartSubtitle: { x: 300, y: 426, fontSize: 29 },
  chart: { left: 60, top: 470, width: 1375, height: 300 } satisfies ChartRect,
  axisLabel: { x: 1452, fontSize: 26 },
  timeLabel: { y: 812, fontSize: 27 },
  footer: { y: 866, fontSize: 24 },
  statusDot: { radius: 9, gap: 26 },
} as const;

const TIME_LABELS = ["24시간 전", "18시간 전", "12시간 전", "6시간 전", "현재"] as const;

// region [Privates]
const resolveFontSpec = (fontWeight: number, fontSizePx: number, fontStack: string): string => {
  return `${fontWeight} ${fontSizePx}px ${fontStack}`;
};

/** 가용 폭을 넘지 않도록 크기를 줄여 그린다. 그린 폭을 돌려준다. */
const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    x: number;
    y: number;
    fontWeight: number;
    maxFontSizePx: number;
    maxWidth: number;
    fontStack: string;
  },
): number => {
  const { x, y, fontWeight, maxFontSizePx, maxWidth, fontStack } = options;

  context.font = resolveFontSpec(fontWeight, maxFontSizePx, fontStack);

  const fittedFontSize = resolveFittedFontSize(context.measureText(text).width, {
    maxWidth,
    maxFontSizePx,
  });

  if (fittedFontSize !== maxFontSizePx) {
    context.font = resolveFontSpec(fontWeight, fittedFontSize, fontStack);
  }

  context.fillText(text, x, y);

  return context.measureText(text).width;
};

const drawPanelBackground = (context: CanvasRenderingContext2D): void => {
  const { width, height } = BILLBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = BILLBOARD_COLORS.panelEdge;
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);

  context.strokeStyle = BILLBOARD_COLORS.divider;
  context.lineWidth = 2;

  for (const dividerY of LAYOUT.dividers) {
    context.beginPath();
    context.moveTo(LAYOUT.chart.left, dividerY);
    context.lineTo(BILLBOARD_TEXTURE.width - BILLBOARD_TEXTURE.paddingX, dividerY);
    context.stroke();
  }
};

/**
 * 비트코인 마크.
 *
 * `₿`(U+20BF) 글리프가 없는 환경에서 두부가 뜨는 것을 막으려고 도형으로 그린다.
 * 주황 원 + 기울인 `B` + 위아래로 뻗은 세로 획 두 개다.
 */
const drawBitcoinMark = (context: CanvasRenderingContext2D): void => {
  const { centerX, centerY, radius } = LAYOUT.logo;

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = BILLBOARD_COLORS.brand;
  context.fill();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(-(14 * Math.PI) / 180);
  context.fillStyle = "#ffffff";

  const strokeWidth = radius * 0.13;
  const strokeHeight = radius * 0.42;

  for (const offsetX of [-radius * 0.22, radius * 0.1]) {
    context.fillRect(offsetX, -radius * 0.78, strokeWidth, strokeHeight);
    context.fillRect(offsetX, radius * 0.36, strokeWidth, strokeHeight);
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = resolveFontSpec(700, radius * 1.5, SANS_FONT_STACK);
  context.fillText("B", 0, 0);
  context.restore();
};

/** 상승·하락 삼각형. 글리프 대신 도형이라 폰트에 기대지 않는다. */
const drawToneTriangle = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  tone: BillboardTone,
): void => {
  if (tone === "flat") {
    context.fillStyle = BILLBOARD_COLORS.flat;
    context.fillRect(centerX - size / 2, centerY - size * 0.08, size, size * 0.16);
    return;
  }

  const direction = tone === "up" ? -1 : 1;

  context.beginPath();
  context.moveTo(centerX, centerY + (direction * size) / 2);
  context.lineTo(centerX - size / 2, centerY - (direction * size) / 2);
  context.lineTo(centerX + size / 2, centerY - (direction * size) / 2);
  context.closePath();
  context.fillStyle = resolveToneColor(tone);
  context.fill();
};

const drawConnectionDot = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  isConnected: boolean,
): void => {
  context.beginPath();
  context.arc(x, y, LAYOUT.statusDot.radius, 0, Math.PI * 2);
  context.fillStyle = isConnected ? BILLBOARD_COLORS.online : BILLBOARD_COLORS.offline;
  context.fill();
};

/** 통화 한 줄. 라벨 · 단위 · 가격 · 변동률을 고정 컬럼에 그린다. */
const drawPriceRow = (
  context: CanvasRenderingContext2D,
  options: {
    centerY: number;
    label: string;
    unit: string;
    priceText: string;
    changeText: string;
    tone: BillboardTone;
    isConnected: boolean;
  },
): void => {
  const { centerY, label, unit, priceText, isConnected } = options;
  // 시세가 아직 없으면 변동률 0.00% 도 의미가 없다. 같이 비워 둔다.
  const hasPrice = priceText !== BILLBOARD_PLACEHOLDER;
  const tone = hasPrice ? options.tone : "flat";
  const changeText = hasPrice ? options.changeText : BILLBOARD_PLACEHOLDER;

  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(700, LAYOUT.rowLabel.fontSize, SANS_FONT_STACK);
  context.fillText(label, LAYOUT.rowLabel.x, centerY);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowUnit.fontSize, SANS_FONT_STACK);
  context.fillText(unit, LAYOUT.rowUnit.x, centerY);

  context.fillStyle = BILLBOARD_COLORS.price;
  drawFittedText(context, priceText, {
    x: LAYOUT.rowPrice.x,
    y: centerY,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowPrice.fontSize,
    maxWidth: LAYOUT.rowPrice.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });

  const triangleSize = LAYOUT.rowChange.fontSize * 0.56;

  if (hasPrice) {
    drawToneTriangle(context, LAYOUT.rowChange.x, centerY, triangleSize, tone);
  }

  context.fillStyle = resolveToneColor(tone);
  drawFittedText(context, changeText, {
    x: LAYOUT.rowChange.x + triangleSize,
    y: centerY,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowChange.fontSize,
    maxWidth: LAYOUT.rowChange.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowChangeSuffix.fontSize, SANS_FONT_STACK);
  context.fillText("24h", LAYOUT.rowChangeSuffix.x, centerY);

  drawConnectionDot(
    context,
    BILLBOARD_TEXTURE.width - BILLBOARD_TEXTURE.paddingX - LAYOUT.statusDot.gap,
    centerY,
    isConnected,
  );
};

/** 차트 격자와 오른쪽 가격 축. */
const drawChartAxes = (
  context: CanvasRenderingContext2D,
  ticks: readonly number[],
  scale: { min: number; max: number },
): void => {
  const rect = LAYOUT.chart;

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.setLineDash([6, 8]);
  context.lineWidth = 1.5;

  for (const tickValue of ticks) {
    const tickY = resolveTickY(tickValue, { ...scale, ticks: [] }, rect);

    context.beginPath();
    context.strokeStyle = BILLBOARD_COLORS.chartGrid;
    context.moveTo(rect.left, tickY);
    context.lineTo(rect.left + rect.width, tickY);
    context.stroke();

    context.fillStyle = BILLBOARD_COLORS.chartAxis;
    context.font = resolveFontSpec(500, LAYOUT.axisLabel.fontSize, NUMERIC_FONT_STACK);
    context.fillText(formatAxisPrice(tickValue), LAYOUT.axisLabel.x, tickY);
  }

  context.setLineDash([]);
};

/** 가로 시간 라벨. 24시간 전부터 현재까지 균등 배치한다. */
const drawTimeLabels = (context: CanvasRenderingContext2D): void => {
  const rect = LAYOUT.chart;
  const lastIndex = TIME_LABELS.length - 1;

  context.fillStyle = BILLBOARD_COLORS.chartAxis;
  context.font = resolveFontSpec(500, LAYOUT.timeLabel.fontSize, SANS_FONT_STACK);
  context.textBaseline = "middle";

  TIME_LABELS.forEach((label, index) => {
    // 양 끝 라벨이 차트 밖으로 삐져나가지 않도록 정렬을 바꾼다.
    context.textAlign = index === 0 ? "left" : index === lastIndex ? "right" : "center";
    context.fillText(label, rect.left + (rect.width / lastIndex) * index, LAYOUT.timeLabel.y);
  });
};

/**
 * 현재가를 가리키는 끝점 배지.
 *
 * 차트 위쪽 바깥에 두면 오른쪽 가격 축 라벨과 겹친다. 끝점 왼쪽 위에 붙이고
 * 차트 영역 안으로 가둬 축을 침범하지 않게 한다.
 */
const drawCurrentPriceBadge = (
  context: CanvasRenderingContext2D,
  lastPoint: { x: number; y: number },
  priceText: string,
  tone: BillboardTone,
): void => {
  const rect = LAYOUT.chart;
  const badgeFontSize = 28;
  const paddingX = 16;
  const badgeHeight = badgeFontSize + 18;

  context.font = resolveFontSpec(700, badgeFontSize, NUMERIC_FONT_STACK);

  const badgeWidth = context.measureText(priceText).width + paddingX * 2;
  const badgeLeft = Math.max(lastPoint.x - badgeWidth - 12, rect.left + 4);
  const badgeTop = Math.min(
    Math.max(lastPoint.y - badgeHeight - 12, rect.top + 4),
    rect.top + rect.height - badgeHeight - 4,
  );

  context.beginPath();
  context.roundRect(badgeLeft, badgeTop, badgeWidth, badgeHeight, 8);
  context.fillStyle = resolveToneColor(tone);
  context.fill();

  context.fillStyle = BILLBOARD_COLORS.background;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(priceText, badgeLeft + badgeWidth / 2, badgeTop + badgeHeight / 2);

  context.beginPath();
  context.arc(lastPoint.x, lastPoint.y, 7, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
};

/** 꺾은선과 아래쪽 면적. 선 색은 24시간 방향을 따른다. */
const drawChartSeries = (
  context: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  tone: BillboardTone,
): void => {
  if (points.length < 2) {
    return;
  }

  const rect = LAYOUT.chart;
  const lineColor = resolveToneColor(tone === "flat" ? "up" : tone);
  const areaGradient = context.createLinearGradient(0, rect.top, 0, rect.top + rect.height);
  areaGradient.addColorStop(0, `${lineColor}59`);
  areaGradient.addColorStop(1, `${lineColor}00`);

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.lineTo(points[points.length - 1].x, rect.top + rect.height);
  context.lineTo(points[0].x, rect.top + rect.height);
  context.closePath();
  context.fillStyle = areaGradient;
  context.fill();

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }

  context.strokeStyle = lineColor;
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke();
};

const drawChartPlaceholder = (context: CanvasRenderingContext2D): void => {
  const rect = LAYOUT.chart;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.chartAxis;
  context.font = resolveFontSpec(500, 32, SANS_FONT_STACK);
  context.fillText(
    "24시간 데이터를 불러오는 중",
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
};

const drawChartSection = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(700, LAYOUT.chartTitle.fontSize, SANS_FONT_STACK);
  context.fillText("최근 24시간", LAYOUT.chartTitle.x, LAYOUT.chartTitle.y);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.chartSubtitle.fontSize, SANS_FONT_STACK);
  context.fillText("BTC / USD", LAYOUT.chartSubtitle.x, LAYOUT.chartSubtitle.y);

  const sampledPrices = downsamplePrices(state.usdSeries, BILLBOARD_CHART_MAX_POINTS);

  if (sampledPrices.length < 2) {
    drawChartPlaceholder(context);
    drawTimeLabels(context);
    return;
  }

  const scale = resolveChartScale(sampledPrices);
  const points = resolveChartPoints(sampledPrices, scale, LAYOUT.chart);
  const tone = resolveChangeTone(state.usdChange24h);

  drawChartAxes(context, scale.ticks, scale);
  drawChartSeries(context, points, tone);
  drawTimeLabels(context);
  drawCurrentPriceBadge(
    context,
    points[points.length - 1],
    formatAxisPrice(sampledPrices[sampledPrices.length - 1]),
    tone,
  );
};
// endregion

/**
 * 전광판 한 장을 그린다.
 *
 * 모든 글자는 자기 칸의 가용 폭에 맞춰 자동으로 줄어든다. 고정 크기로 두면
 * 가격 자리수가 늘어나는 순간 옆 칸을 침범한다.
 */
export const drawBillboard = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  drawPanelBackground(context);
  drawBitcoinMark(context);

  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.title.fontSize, SANS_FONT_STACK);
  context.fillText("BITCOIN", LAYOUT.title.x, LAYOUT.title.y);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(600, LAYOUT.ticker.fontSize, SANS_FONT_STACK);
  context.fillText("BTC", LAYOUT.ticker.x, LAYOUT.ticker.y);

  drawPriceRow(context, {
    centerY: LAYOUT.rows.krw.centerY,
    label: LAYOUT.rows.krw.label,
    unit: LAYOUT.rows.krw.unit,
    priceText: formatBillboardKrw(state.krw),
    changeText: formatBillboardChange(state.krwChange24h),
    tone: resolveChangeTone(state.krwChange24h),
    isConnected: state.isKrwConnected,
  });

  drawPriceRow(context, {
    centerY: LAYOUT.rows.usd.centerY,
    label: LAYOUT.rows.usd.label,
    unit: LAYOUT.rows.usd.unit,
    priceText: formatBillboardUsd(state.usd),
    changeText: formatBillboardChange(state.usdChange24h),
    tone: resolveChangeTone(state.usdChange24h),
    isConnected: state.isUsdConnected,
  });

  drawChartSection(context, state);
};
