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

/** 멀리서도 끝점이 보이도록 점과 확산 범위를 한 곳에서 관리한다. */
export const BILLBOARD_CHART_MARKER = {
  coreRadius: 12,
  pulseRadius: 64,
} as const;

/** 가격·변동률 컬럼의 가용 폭. 이 폭을 넘으면 글자를 줄인다. */
export const BILLBOARD_COLUMNS = {
  priceMaxWidth: 800,
  changeMaxWidth: 300,
} as const;

/**
 * 글자 크기 하한.
 *
 * 패널 폭 9.6 m 가 텍스처 1600 px 에 대응하므로 1 px 는 6 mm 다. 36 px 글자의
 * 숫자 높이는 약 0.15 m 이고, 32 m 거리에서 약 16 arcmin 로 가독 한계(약
 * 5 arcmin)의 3배다. 계산이 틀렸을 때의 안전장치로 둔다.
 */
export const BILLBOARD_MIN_FONT_SIZE_PX = 36;

export const BILLBOARD_COLORS = {
  background: "#0a0f16",
  panelEdge: "#1b2432",
  divider: "#1b2635",
  label: "#e6ecf5",
  labelMuted: "#7d8ba1",
  rowSurfaceTop: "#111d2b",
  rowSurfaceBottom: "#0e1722",
  rowBorder: "#223143",
  rowDivider: "#203044",
  tickerSurface: "#182738",
  tickerText: "#c6d5e6",
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

export interface BillboardChartEndpoint {
  x: number;
  y: number;
  color: string;
}

const KRW_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const USD_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
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

/** 1600 × 900 기준 원거리 시인성 레이아웃. 가격 행의 높이와 칸 폭을 함께 확보한다. */
const LAYOUT = {
  logo: { centerX: 106, centerY: 80, radius: 44 },
  title: { x: 176, y: 82, fontSize: 64 },
  ticker: { x: 546, y: 82, fontSize: 42 },
  tickerBadge: { x: 488, y: 52, width: 116, height: 60, radius: 12 },
  marketLabel: { x: 1514, y: 82, fontSize: 28 },
  rows: {
    krw: { centerY: 220, label: "원화", unit: "KRW" },
    usd: { centerY: 368, label: "달러", unit: "USD" },
  },
  rowPanel: { x: 56, width: 1488, height: 132, radius: 16, dividerXs: [252, 1104] },
  rowLabel: { x: 84, fontSize: 52, offsetY: -18 },
  rowUnit: { x: 84, fontSize: 30, offsetY: 30 },
  rowPrice: { x: 288, fontSize: 108, maxWidth: BILLBOARD_COLUMNS.priceMaxWidth, height: 128 },
  rowChange: { x: 1140, fontSize: 68, maxWidth: BILLBOARD_COLUMNS.changeMaxWidth, offsetY: 16 },
  rowChangeSuffix: { x: 1180, fontSize: 24, offsetY: -36 },
  dividers: [132] as const,
  chartTitle: { x: 60, y: 470, fontSize: 38 },
  chartSubtitle: { x: 300, y: 473, fontSize: 29 },
  chart: { left: 60, top: 520, width: 1320, height: 250 } satisfies ChartRect,
  axisLabel: { x: 1452, fontSize: 26 },
  timeLabel: { y: 859, fontSize: 27 },
  footer: { y: 866, fontSize: 24 },
  statusDot: { radius: 7, gap: 26, offsetY: -36 },
} as const;

export interface BillboardPriceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createBillboardPriceRegion = (centerY: number): BillboardPriceRegion => ({
  x: LAYOUT.rowPrice.x,
  y: centerY - LAYOUT.rowPrice.height / 2,
  width: LAYOUT.rowPrice.maxWidth,
  height: LAYOUT.rowPrice.height,
});

/** 기본 전광판과 별도 가격 텍스처가 같은 칸을 사용하도록 레이아웃에서 계산한다. */
export const BILLBOARD_PRICE_REGIONS = {
  krw: createBillboardPriceRegion(LAYOUT.rows.krw.centerY),
  usd: createBillboardPriceRegion(LAYOUT.rows.usd.centerY),
} as const;

const TIME_LABELS = ["24시간 전", "18시간 전", "12시간 전", "6시간 전", "현재"] as const;

// region [Privates]
const resolveFontSpec = (fontWeight: number, fontSizePx: number, fontStack: string): string => {
  return `${fontWeight} ${fontSizePx}px ${fontStack}`;
};

const resolveChartLineColor = (tone: BillboardTone): string => {
  return resolveToneColor(tone === "flat" ? "up" : tone);
};

/** 차트 본문과 별도 끝점 효과가 같은 표본·스케일·좌표를 사용한다. */
const resolveBillboardChartGeometry = (
  state: Pick<BillboardState, "usdSeries" | "usdChange24h">,
) => {
  const sampledPrices = downsamplePrices(state.usdSeries, BILLBOARD_CHART_MAX_POINTS);

  if (sampledPrices.length < 2) {
    return null;
  }

  const scale = resolveChartScale(sampledPrices);
  const points = resolveChartPoints(sampledPrices, scale, LAYOUT.chart);
  const tone = resolveChangeTone(state.usdChange24h);

  return { scale, points, tone };
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

const drawPriceText = (
  context: CanvasRenderingContext2D,
  priceText: string,
  x: number,
  y: number,
): void => {
  context.fillStyle = BILLBOARD_COLORS.price;
  drawFittedText(context, priceText, {
    x,
    y,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowPrice.fontSize,
    maxWidth: LAYOUT.rowPrice.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });
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

/** 통화·가격·등락을 분리하는 정적 표면. 숫자 레이어는 이 위에 투명하게 겹친다. */
const drawPriceRowSurface = (context: CanvasRenderingContext2D, centerY: number): void => {
  const rowTop = centerY - LAYOUT.rowPanel.height / 2;
  const gradient = context.createLinearGradient(0, rowTop, 0, rowTop + LAYOUT.rowPanel.height);
  gradient.addColorStop(0, BILLBOARD_COLORS.rowSurfaceTop);
  gradient.addColorStop(1, BILLBOARD_COLORS.rowSurfaceBottom);

  context.beginPath();
  context.roundRect(
    LAYOUT.rowPanel.x,
    rowTop,
    LAYOUT.rowPanel.width,
    LAYOUT.rowPanel.height,
    LAYOUT.rowPanel.radius,
  );
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = BILLBOARD_COLORS.rowBorder;
  context.lineWidth = 1.5;
  context.stroke();

  context.strokeStyle = BILLBOARD_COLORS.rowDivider;
  context.lineWidth = 1;
  for (const dividerX of LAYOUT.rowPanel.dividerXs) {
    context.beginPath();
    context.moveTo(dividerX, centerY - 36);
    context.lineTo(dividerX, centerY + 36);
    context.stroke();
  }
};

/** 통화명·단위는 두 줄, 가격은 주 정보, 등락률·24h는 독립된 우측 블록으로 그린다. */
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
    shouldDrawPrice: boolean;
  },
): void => {
  const { centerY, label, unit, priceText, isConnected } = options;
  // 시세가 아직 없으면 변동률 0.00% 도 의미가 없다. 같이 비워 둔다.
  const hasPrice = priceText !== BILLBOARD_PLACEHOLDER;
  const tone = hasPrice ? options.tone : "flat";
  const changeText = hasPrice ? options.changeText : BILLBOARD_PLACEHOLDER;

  drawPriceRowSurface(context, centerY);
  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(700, LAYOUT.rowLabel.fontSize, SANS_FONT_STACK);
  context.fillText(label, LAYOUT.rowLabel.x, centerY + LAYOUT.rowLabel.offsetY);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowUnit.fontSize, SANS_FONT_STACK);
  context.fillText(unit, LAYOUT.rowUnit.x, centerY + LAYOUT.rowUnit.offsetY);

  if (options.shouldDrawPrice) {
    drawPriceText(context, priceText, LAYOUT.rowPrice.x, centerY);
  }

  const triangleSize = LAYOUT.rowChange.fontSize * 0.56;

  if (hasPrice) {
    drawToneTriangle(
      context,
      LAYOUT.rowChange.x,
      centerY + LAYOUT.rowChange.offsetY,
      triangleSize,
      tone,
    );
  }

  context.fillStyle = resolveToneColor(tone);
  drawFittedText(context, changeText, {
    x: LAYOUT.rowChange.x + triangleSize,
    y: centerY + LAYOUT.rowChange.offsetY,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowChange.fontSize,
    maxWidth: LAYOUT.rowChange.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowChangeSuffix.fontSize, SANS_FONT_STACK);
  context.fillText("24h", LAYOUT.rowChangeSuffix.x, centerY + LAYOUT.rowChangeSuffix.offsetY);

  drawConnectionDot(
    context,
    BILLBOARD_TEXTURE.width - BILLBOARD_TEXTURE.paddingX - LAYOUT.statusDot.gap,
    centerY + LAYOUT.statusDot.offsetY,
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

/** 마지막 표본은 가격 배지 없이 선과 같은 색의 점으로 표시한다. */
const drawChartEndpoint = (
  context: CanvasRenderingContext2D,
  lastPoint: { x: number; y: number },
  tone: BillboardTone,
): void => {
  context.beginPath();
  context.arc(lastPoint.x, lastPoint.y, BILLBOARD_CHART_MARKER.coreRadius, 0, Math.PI * 2);
  context.fillStyle = resolveChartLineColor(tone);
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
  const lineColor = resolveChartLineColor(tone);
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

  const chartGeometry = resolveBillboardChartGeometry(state);

  if (!chartGeometry) {
    drawChartPlaceholder(context);
    drawTimeLabels(context);
    return;
  }

  const { scale, points, tone } = chartGeometry;

  drawChartAxes(context, scale.ticks, scale);
  drawChartSeries(context, points, tone);
  drawTimeLabels(context);
  drawChartEndpoint(context, points[points.length - 1], tone);
};
// endregion

/** 실제 24시간 차트의 마지막 표본 좌표와 선 색상. 그릴 선이 없으면 효과도 표시하지 않는다. */
export const resolveBillboardChartEndpoint = (
  state: Pick<BillboardState, "usdSeries" | "usdChange24h">,
): BillboardChartEndpoint | null => {
  const chartGeometry = resolveBillboardChartGeometry(state);

  if (!chartGeometry) {
    return null;
  }

  const { points, tone } = chartGeometry;
  const lastPoint = points[points.length - 1];

  return { ...lastPoint, color: resolveChartLineColor(tone) };
};

/** 투명한 가격 전용 텍스처에 숫자만 그린다. 배경 전광판과 글꼴·자동 축소를 공유한다. */
export const drawBillboardPrice = (context: CanvasRenderingContext2D, priceText: string): void => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  drawPriceText(context, priceText, 0, LAYOUT.rowPrice.height / 2);
};

/**
 * 전광판 한 장을 그린다.
 *
 * 모든 글자는 자기 칸의 가용 폭에 맞춰 자동으로 줄어든다. 고정 크기로 두면
 * 가격 자리수가 늘어나는 순간 옆 칸을 침범한다.
 */
export const drawBillboard = (
  context: CanvasRenderingContext2D,
  state: BillboardState,
  options: { shouldDrawPrices?: boolean } = {},
): void => {
  const shouldDrawPrices = options.shouldDrawPrices ?? true;

  drawPanelBackground(context);
  drawBitcoinMark(context);

  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.title.fontSize, SANS_FONT_STACK);
  context.fillText("BITCOIN", LAYOUT.title.x, LAYOUT.title.y);

  context.beginPath();
  context.roundRect(
    LAYOUT.tickerBadge.x,
    LAYOUT.tickerBadge.y,
    LAYOUT.tickerBadge.width,
    LAYOUT.tickerBadge.height,
    LAYOUT.tickerBadge.radius,
  );
  context.fillStyle = BILLBOARD_COLORS.tickerSurface;
  context.fill();
  context.textAlign = "center";
  context.fillStyle = BILLBOARD_COLORS.tickerText;
  context.font = resolveFontSpec(600, LAYOUT.ticker.fontSize, SANS_FONT_STACK);
  context.fillText("BTC", LAYOUT.ticker.x, LAYOUT.ticker.y);

  context.textAlign = "right";
  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.marketLabel.fontSize, SANS_FONT_STACK);
  context.fillText("실시간 시세", LAYOUT.marketLabel.x, LAYOUT.marketLabel.y);

  drawPriceRow(context, {
    centerY: LAYOUT.rows.krw.centerY,
    label: LAYOUT.rows.krw.label,
    unit: LAYOUT.rows.krw.unit,
    priceText: formatBillboardKrw(state.krw),
    changeText: formatBillboardChange(state.krwChange24h),
    tone: resolveChangeTone(state.krwChange24h),
    isConnected: state.isKrwConnected,
    shouldDrawPrice: shouldDrawPrices,
  });

  drawPriceRow(context, {
    centerY: LAYOUT.rows.usd.centerY,
    label: LAYOUT.rows.usd.label,
    unit: LAYOUT.rows.usd.unit,
    priceText: formatBillboardUsd(state.usd),
    changeText: formatBillboardChange(state.usdChange24h),
    tone: resolveChangeTone(state.usdChange24h),
    isConnected: state.isUsdConnected,
    shouldDrawPrice: shouldDrawPrices,
  });

  drawChartSection(context, state);
};
