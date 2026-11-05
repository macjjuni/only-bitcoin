import type { BtcCandle } from "@/entities/bitcoin";
import { drawBitcoinCoin } from "@/shared/lib/bitcoinIconCanvas";
import { type ChartRect, resolveChartScale, resolveTickY } from "./billboardChart";
import {
  drawFittedText,
  drawScreenCard,
  drawScreenDivider,
  formatCompactUsd,
  NUMERIC_FONT_STACK,
  resolveFontSpec,
  SANS_FONT_STACK,
  SCREEN_COLORS,
  SCREEN_MIN_FONT_SIZE_PX,
  SCREEN_TEXTURE,
} from "./screenCanvas";

export { resolveFittedFontSize, type TextFitOptions } from "./screenCanvas";

/**
 * 메인 전광판 왼쪽 칸, 비트코인 시세 텍스처.
 *
 * 시안(`assets/screen_A.png`)은 달러 하나만 크게 띄웠는데 원화도 같은 무게로
 * 보여야 해서 가격을 두 줄로 나눴음. 원화는 브랜드 주황, 달러는 크림색으로 갈라
 * 멀리서도 어느 줄이 어느 통화인지 색으로 먼저 읽힘. 그 아래는 30분봉 캔들과
 * 거래대금, 맨 아래는 24시간 고가·저가·거래대금·시가총액.
 */

export const BILLBOARD_TEXTURE = {
  width: SCREEN_TEXTURE.width,
  height: SCREEN_TEXTURE.height,
  /** 텍스처 재업로드 간격 상한. 시세는 초당 수십 번 바뀐다. */
  minRedrawIntervalMs: 250,
  paddingX: SCREEN_TEXTURE.paddingX,
} as const;

/** 멀리서도 끝점이 보이도록 점과 확산 범위를 한 곳에서 관리함. */
export const BILLBOARD_CHART_MARKER = {
  coreRadius: 12,
  pulseRadius: 48,
} as const;

/**
 * 우측 상단 접속 표시 점.
 *
 * 확산 효과는 이 텍스처가 아니라 `BillboardOnlinePulse` 가 3D 링으로 그림.
 * 베이스 텍스처는 상태가 바뀔 때만 다시 올리므로 프레임마다 커지는 원을 구울
 * 수 없음. 두 쪽이 같은 자리에 붙어야 하므로 좌표를 여기서 한 번만 정함.
 */
export const BILLBOARD_ONLINE_MARKER = {
  x: 1352,
  y: 126,
  coreRadius: 10,
  pulseRadius: 30,
} as const;

/** 가격·등락률 칸의 최대 폭. 넘으면 글자를 줄임. */
export const BILLBOARD_COLUMNS = {
  priceMaxWidth: 960,
  changeMaxWidth: 200,
} as const;

export const BILLBOARD_MIN_FONT_SIZE_PX = SCREEN_MIN_FONT_SIZE_PX;

export const BILLBOARD_COLORS = SCREEN_COLORS;

/** 값이 아직 없을 때 표시할 자리. 스토어는 0 으로 시작함. */
export const BILLBOARD_PLACEHOLDER = "—";

export type BillboardTone = "up" | "down" | "flat";

export type BillboardCurrency = "krw" | "usd";

export interface BillboardState {
  krw: number;
  usd: number;
  krwChange24h: string;
  usdChange24h: string;
  isKrwConnected: boolean;
  isUsdConnected: boolean;
  /** 바이낸스 BTCUSDT 30분봉 24시간. 비어 있으면 차트 자리에 안내를 띄움. */
  candles: readonly BtcCandle[];
  /** 24시간 고가·저가·거래대금(USD). 모르면 0. */
  highUsd: number;
  lowUsd: number;
  quoteVolumeUsd: number;
  /** 지금까지 채굴된 BTC. 시가총액 계산에 씀. 모르면 0. */
  circulatingSupply: number;
}

export interface BillboardChartEndpoint {
  x: number;
  y: number;
  color: string;
}

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * 1600 × 1200 레이아웃.
 *
 * 세로 예산: 헤더 200 · 가격 두 줄 340 · 차트 470 · 하단 지표 140. 가격 두 줄이
 * 같은 크기라 원화가 열두 글자(₩145,230,000)여도 960 px 칸에 들어가게 132 px 로
 * 잡았음.
 *
 * 라벨은 34 px 아래로 두지 않음. 폰에서는 패널이 600 px 안팎으로 줄어 28 px
 * 라벨이 7 px 로 보여 못 읽었음.
 */
const LAYOUT = {
  logo: { centerX: 138, centerY: 126, radius: 54 },
  title: { x: 216, y: 108, fontSize: 56 },
  subtitle: { x: 218, y: 164, fontSize: 34 },
  statusBadge: { x: 1316, y: 94, width: 200, height: 64, radius: 32 },
  /** 점 오른쪽 남은 폭의 가운데. 글자 길이가 달라도 좌우 여백이 맞음. */
  statusBadgeText: { x: 1446, y: 127, fontSize: 30 },
  rows: {
    krw: { centerY: 290, unit: "KRW" },
    usd: { centerY: 450, unit: "USD" },
  },
  rowDividerY: 370,
  rowTag: { x: 84, width: 128, height: 64, radius: 14, fontSize: 32 },
  rowPrice: { x: 236, fontSize: 132, maxWidth: BILLBOARD_COLUMNS.priceMaxWidth, height: 160 },
  rowChange: { right: 1516, width: 280, height: 80, radius: 16, fontSize: 42 },
  chartCaption: { x: 84, y: 548, fontSize: 34 },
  chart: { left: 84, top: 590, width: 1432, height: 300 } satisfies ChartRect,
  /** 끝점 점과 펄스가 앉을 오른쪽 여백. 캔들은 이 앞에서 끝남. */
  chartEndGutter: 56,
  volume: { top: 910, height: 90 },
  footerDividerY: 1036,
  footerLabel: { y: 1074, fontSize: 34 },
  footerValue: { y: 1132, fontSize: 52 },
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

/** 기본 전광판과 별도 가격 텍스처가 같은 칸을 쓰도록 레이아웃에서 계산함. */
export const BILLBOARD_PRICE_REGIONS = {
  krw: createBillboardPriceRegion(LAYOUT.rows.krw.centerY),
  usd: createBillboardPriceRegion(LAYOUT.rows.usd.centerY),
} as const;

/** 통화별 가격 색. 원화는 주황, 달러는 크림. */
const PRICE_COLORS: Record<BillboardCurrency, string> = {
  krw: SCREEN_COLORS.brand,
  usd: SCREEN_COLORS.label,
};

// region [Privates]
/** 시세는 스토어 초기값이 0 이므로 0 과 비유한 값을 모두 미표시로 봄. */
const isDisplayablePrice = (price: number): boolean => {
  return Number.isFinite(price) && price > 0;
};

const parseChange = (change: string | number): number | null => {
  const parsed = typeof change === "number" ? change : Number.parseFloat(change);
  return Number.isFinite(parsed) ? parsed : null;
};
// endregion

export const formatBillboardKrw = (price: number): string => {
  return isDisplayablePrice(price) ? `₩${INTEGER_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

export const formatBillboardUsd = (price: number): string => {
  return isDisplayablePrice(price) ? `$${INTEGER_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

/** 소수 두 자리로 고정함. 자리수가 흔들리면 4 Hz 갱신 때 글자가 떰. */
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

/**
 * 하단 지표 네 칸의 글자.
 *
 * 베이스 텍스처 변경 감지에도 이 글자를 씀. 시가총액은 시세가 바뀔 때마다 값이
 * 달라지지만 표시(`$2.07T`)는 거의 그대로라, 글자로 비교해야 250ms 마다 큰
 * 텍스처를 다시 올리지 않음.
 */
export const resolveBillboardFooter = (
  state: Pick<
    BillboardState,
    "usd" | "highUsd" | "lowUsd" | "quoteVolumeUsd" | "circulatingSupply"
  >,
): readonly { label: string; value: string }[] => {
  const marketCap = isDisplayablePrice(state.usd) ? state.usd * state.circulatingSupply : 0;

  return [
    { label: "고가", value: formatBillboardUsd(state.highUsd) },
    { label: "저가", value: formatBillboardUsd(state.lowUsd) },
    { label: "거래대금", value: formatCompactUsd(state.quoteVolumeUsd) ?? BILLBOARD_PLACEHOLDER },
    { label: "시가총액", value: formatCompactUsd(marketCap) ?? BILLBOARD_PLACEHOLDER },
  ];
};

/**
 * 전광판 접속 표시 기준.
 *
 * 한쪽 피드만 살아 있어도 온라인으로 봄. 숫자가 눈앞에서 바뀌는데 "오프라인"
 * 이라고 적혀 있으면 더 혼란스러움.
 */
export const resolveBillboardOnlineStatus = (
  state: Pick<BillboardState, "isKrwConnected" | "isUsdConnected">,
): boolean => {
  return state.isKrwConnected || state.isUsdConnected;
};

// region [Privates]
const resolveChartLineColor = (tone: BillboardTone): string => {
  return resolveToneColor(tone === "flat" ? "up" : tone);
};

/** 차트 본문과 별도 끝점 효과가 같은 스케일·좌표를 쓰게 한 곳에서 계산함. */
const resolveBillboardChartGeometry = (state: Pick<BillboardState, "candles" | "usdChange24h">) => {
  const candles = state.candles.filter(
    (candle) =>
      Number.isFinite(candle.high) && Number.isFinite(candle.low) && candle.high >= candle.low,
  );

  if (candles.length < 2) {
    return null;
  }

  const rect = LAYOUT.chart;
  const scale = resolveChartScale(candles.flatMap((candle) => [candle.high, candle.low]));
  const valueSpan = scale.max - scale.min || 1;
  const toY = (price: number): number => {
    const clampedPrice = Math.min(Math.max(price, scale.min), scale.max);
    return rect.top + rect.height * (1 - (clampedPrice - scale.min) / valueSpan);
  };
  const slotWidth = (rect.width - LAYOUT.chartEndGutter) / candles.length;
  const lastCandle = candles[candles.length - 1];
  const tone = resolveChangeTone(state.usdChange24h);

  return {
    candles,
    scale,
    toY,
    slotWidth,
    tone,
    endpoint: { x: rect.left + rect.width - LAYOUT.chartEndGutter / 2, y: toY(lastCandle.close) },
  };
};

const drawPriceText = (
  context: CanvasRenderingContext2D,
  priceText: string,
  currency: BillboardCurrency,
  x: number,
  y: number,
): void => {
  context.fillStyle = PRICE_COLORS[currency];
  drawFittedText(context, priceText, {
    x,
    y,
    fontWeight: 800,
    maxFontSizePx: LAYOUT.rowPrice.fontSize,
    maxWidth: LAYOUT.rowPrice.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });
};

/** 헤더의 `<KIcon icon="bitcoin" />` 과 같은 패스로 그린 코인 마크. */
const drawBitcoinMark = (context: CanvasRenderingContext2D): void => {
  const { centerX, centerY, radius } = LAYOUT.logo;

  drawBitcoinCoin(context, centerX, centerY, radius, BILLBOARD_COLORS.brand, "#ffffff");
};

const drawHeader = (context: CanvasRenderingContext2D, isOnline: boolean): void => {
  drawBitcoinMark(context);

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.title.fontSize, NUMERIC_FONT_STACK);
  context.fillText("BITCOIN", LAYOUT.title.x, LAYOUT.title.y);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.subtitle.fontSize, SANS_FONT_STACK);
  context.fillText("실시간 시세 · 24시간 변동", LAYOUT.subtitle.x, LAYOUT.subtitle.y);

  drawOnlineBadge(context, isOnline);
};

/** 우측 상단 접속 배지. 점의 확산 효과는 `BillboardOnlinePulse` 가 겹쳐 그림. */
const drawOnlineBadge = (context: CanvasRenderingContext2D, isOnline: boolean): void => {
  const accentColor = isOnline ? BILLBOARD_COLORS.online : BILLBOARD_COLORS.offline;
  const { x, y, width, height, radius } = LAYOUT.statusBadge;

  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = BILLBOARD_COLORS.surface;
  context.fill();

  context.beginPath();
  context.arc(
    BILLBOARD_ONLINE_MARKER.x,
    BILLBOARD_ONLINE_MARKER.y,
    BILLBOARD_ONLINE_MARKER.coreRadius,
    0,
    Math.PI * 2,
  );
  context.fillStyle = accentColor;
  context.fill();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.font = resolveFontSpec(700, LAYOUT.statusBadgeText.fontSize, SANS_FONT_STACK);
  context.fillText(
    isOnline ? "온라인" : "오프라인",
    LAYOUT.statusBadgeText.x,
    LAYOUT.statusBadgeText.y,
  );
};

/** 상승·하락 삼각형. 글리프 대신 도형이라 폰트에 기대지 않음. */
const drawToneTriangle = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  tone: BillboardTone,
  color: string,
): void => {
  context.fillStyle = color;

  if (tone === "flat") {
    context.fillRect(centerX - size / 2, centerY - size * 0.08, size, size * 0.16);
    return;
  }

  const direction = tone === "up" ? -1 : 1;

  context.beginPath();
  context.moveTo(centerX, centerY + (direction * size) / 2);
  context.lineTo(centerX - size / 2, centerY - (direction * size) / 2);
  context.lineTo(centerX + size / 2, centerY - (direction * size) / 2);
  context.closePath();
  context.fill();
};

/** 통화 꼬리표. 원화는 주황 테두리, 달러는 크림 테두리라 가격 색과 짝이 맞음. */
const drawCurrencyTag = (
  context: CanvasRenderingContext2D,
  centerY: number,
  unit: string,
  currency: BillboardCurrency,
): void => {
  const { x, width, height, radius, fontSize } = LAYOUT.rowTag;
  const color = PRICE_COLORS[currency];

  context.beginPath();
  context.roundRect(x, centerY - height / 2, width, height, radius);
  context.fillStyle = BILLBOARD_COLORS.surface;
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.font = resolveFontSpec(800, fontSize, NUMERIC_FONT_STACK);
  context.fillText(unit, x + width / 2, centerY + 2);
};

/** 등락 배지. 시안처럼 색 바탕에 어두운 글자를 얹음. */
const drawChangeBadge = (
  context: CanvasRenderingContext2D,
  centerY: number,
  changeText: string,
  tone: BillboardTone,
  hasPrice: boolean,
): void => {
  const { right, width, height, radius, fontSize } = LAYOUT.rowChange;
  const left = right - width;
  const accentColor = hasPrice ? resolveToneColor(tone) : BILLBOARD_COLORS.surface;
  const textColor = hasPrice ? BILLBOARD_COLORS.onAccent : BILLBOARD_COLORS.labelMuted;
  const triangleSize = fontSize * 0.6;
  const contentLeft = left + 28;

  context.beginPath();
  context.roundRect(left, centerY - height / 2, width, height, radius);
  context.fillStyle = accentColor;
  context.fill();

  if (hasPrice) {
    drawToneTriangle(
      context,
      contentLeft + triangleSize / 2,
      centerY,
      triangleSize,
      tone,
      textColor,
    );
  }

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = textColor;
  drawFittedText(context, changeText, {
    x: contentLeft + triangleSize + 16,
    y: centerY + 2,
    fontWeight: 800,
    maxFontSizePx: fontSize,
    maxWidth: BILLBOARD_COLUMNS.changeMaxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });
};

const drawPriceRow = (
  context: CanvasRenderingContext2D,
  options: {
    currency: BillboardCurrency;
    priceText: string;
    changeText: string;
    tone: BillboardTone;
    shouldDrawPrice: boolean;
  },
): void => {
  const { currency, priceText } = options;
  const { centerY, unit } = LAYOUT.rows[currency];
  // 시세가 아직 없으면 변동률 0.00% 도 의미가 없음. 같이 비워 둠.
  const hasPrice = priceText !== BILLBOARD_PLACEHOLDER;
  const tone = hasPrice ? options.tone : "flat";
  const changeText = hasPrice ? options.changeText : BILLBOARD_PLACEHOLDER;

  drawCurrencyTag(context, centerY, unit, currency);

  if (options.shouldDrawPrice) {
    context.textAlign = "left";
    context.textBaseline = "middle";
    drawPriceText(context, priceText, currency, LAYOUT.rowPrice.x, centerY);
  }

  drawChangeBadge(context, centerY, changeText, tone, hasPrice);
};

const drawChartPlaceholder = (context: CanvasRenderingContext2D): void => {
  const rect = LAYOUT.chart;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, 34, SANS_FONT_STACK);
  context.fillText(
    "24시간 차트를 불러오는 중",
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
};

/** 차트 격자. 시안처럼 숫자 없이 옅은 점선만 둠. 숫자는 하단 고가·저가가 맡음. */
const drawChartGrid = (
  context: CanvasRenderingContext2D,
  scale: { min: number; max: number; ticks: number[] },
): void => {
  const rect = LAYOUT.chart;

  context.setLineDash([4, 10]);
  context.strokeStyle = BILLBOARD_COLORS.grid;
  context.lineWidth = 1.5;

  for (const tickValue of scale.ticks) {
    const tickY = resolveTickY(tickValue, scale, rect);

    context.beginPath();
    context.moveTo(rect.left, tickY);
    context.lineTo(rect.left + rect.width, tickY);
    context.stroke();
  }

  context.setLineDash([]);
};

/** 캔들과 아래 거래대금 막대. 양봉·음봉 색은 등락 배지와 같음. */
const drawCandles = (
  context: CanvasRenderingContext2D,
  geometry: NonNullable<ReturnType<typeof resolveBillboardChartGeometry>>,
): void => {
  const { candles, toY, slotWidth } = geometry;
  const rect = LAYOUT.chart;
  const bodyWidth = Math.max(4, slotWidth * 0.62);
  const wickWidth = Math.max(2, slotWidth * 0.12);
  const maxVolume = Math.max(...candles.map((candle) => candle.quoteVolume), 0);

  candles.forEach((candle, index) => {
    const centerX = rect.left + slotWidth * (index + 0.5);
    const isUp = candle.close >= candle.open;
    const color = isUp ? BILLBOARD_COLORS.up : BILLBOARD_COLORS.down;
    const bodyTop = toY(Math.max(candle.open, candle.close));
    const bodyBottom = toY(Math.min(candle.open, candle.close));

    context.fillStyle = color;
    context.fillRect(
      centerX - wickWidth / 2,
      toY(candle.high),
      wickWidth,
      toY(candle.low) - toY(candle.high),
    );
    // 시가와 종가가 같으면 몸통이 사라지므로 최소 높이를 줌.
    context.fillRect(
      centerX - bodyWidth / 2,
      bodyTop,
      bodyWidth,
      Math.max(3, bodyBottom - bodyTop),
    );

    if (maxVolume > 0 && Number.isFinite(candle.quoteVolume) && candle.quoteVolume > 0) {
      const barHeight = (candle.quoteVolume / maxVolume) * LAYOUT.volume.height;

      context.globalAlpha = 0.55;
      context.fillRect(
        centerX - bodyWidth / 2,
        LAYOUT.volume.top + LAYOUT.volume.height - barHeight,
        bodyWidth,
        barHeight,
      );
      context.globalAlpha = 1;
    }
  });
};

/** 현재가 점선과 오른쪽 끝 점. 펄스 링은 `BillboardChartPulse` 가 같은 자리에 겹침. */
const drawCurrentPriceMarker = (
  context: CanvasRenderingContext2D,
  endpoint: { x: number; y: number },
  tone: BillboardTone,
): void => {
  const color = resolveChartLineColor(tone);

  context.setLineDash([10, 10]);
  context.strokeStyle = color;
  context.globalAlpha = 0.6;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(LAYOUT.chart.left, endpoint.y);
  context.lineTo(endpoint.x, endpoint.y);
  context.stroke();
  context.setLineDash([]);
  context.globalAlpha = 1;

  context.beginPath();
  context.arc(endpoint.x, endpoint.y, BILLBOARD_CHART_MARKER.coreRadius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
};

const drawChartSection = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.chartCaption.fontSize, SANS_FONT_STACK);
  context.fillText("최근 24시간 · BTC/USDT 30분봉", LAYOUT.chartCaption.x, LAYOUT.chartCaption.y);

  const geometry = resolveBillboardChartGeometry(state);

  if (!geometry) {
    drawChartPlaceholder(context);
    return;
  }

  drawChartGrid(context, geometry.scale);
  drawCandles(context, geometry);
  drawCurrentPriceMarker(context, geometry.endpoint, geometry.tone);
};

/** 하단 지표 네 칸. 라벨은 흐리게, 값은 등폭 숫자로. */
const drawFooter = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  const cells = resolveBillboardFooter(state);
  const left = BILLBOARD_TEXTURE.paddingX;
  const columnWidth = (BILLBOARD_TEXTURE.width - left * 2) / cells.length;

  drawScreenDivider(context, LAYOUT.footerDividerY);

  context.textAlign = "left";
  context.textBaseline = "middle";

  cells.forEach((cell, index) => {
    const x = left + columnWidth * index;

    context.fillStyle = BILLBOARD_COLORS.labelMuted;
    context.font = resolveFontSpec(500, LAYOUT.footerLabel.fontSize, SANS_FONT_STACK);
    context.fillText(cell.label, x, LAYOUT.footerLabel.y);

    context.fillStyle = BILLBOARD_COLORS.label;
    drawFittedText(context, cell.value, {
      x,
      y: LAYOUT.footerValue.y,
      fontWeight: 700,
      maxFontSizePx: LAYOUT.footerValue.fontSize,
      maxWidth: columnWidth - 24,
      fontStack: NUMERIC_FONT_STACK,
    });
  });
};
// endregion

/** 실제 차트의 현재가 점 좌표와 색. 그릴 캔들이 없으면 효과도 띄우지 않음. */
export const resolveBillboardChartEndpoint = (
  state: Pick<BillboardState, "candles" | "usdChange24h">,
): BillboardChartEndpoint | null => {
  const geometry = resolveBillboardChartGeometry(state);

  if (!geometry) {
    return null;
  }

  return { ...geometry.endpoint, color: resolveChartLineColor(geometry.tone) };
};

/** 투명한 가격 전용 텍스처에 숫자만 그림. 배경 전광판과 글꼴·자동 축소를 공유함. */
export const drawBillboardPrice = (
  context: CanvasRenderingContext2D,
  priceText: string,
  currency: BillboardCurrency,
): void => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  drawPriceText(context, priceText, currency, 0, LAYOUT.rowPrice.height / 2);
};

/**
 * 시세 패널 한 장을 그린다.
 *
 * 모든 글자는 자기 칸의 가용 폭에 맞춰 자동으로 줄어듦. 고정 크기로 두면 가격
 * 자리수가 늘어나는 순간 옆 칸을 침범함.
 */
export const drawBillboard = (
  context: CanvasRenderingContext2D,
  state: BillboardState,
  options: { shouldDrawPrices?: boolean } = {},
): void => {
  const shouldDrawPrices = options.shouldDrawPrices ?? true;

  drawScreenCard(context);
  drawHeader(context, resolveBillboardOnlineStatus(state));

  drawPriceRow(context, {
    currency: "krw",
    priceText: formatBillboardKrw(state.krw),
    changeText: formatBillboardChange(state.krwChange24h),
    tone: resolveChangeTone(state.krwChange24h),
    shouldDrawPrice: shouldDrawPrices,
  });

  context.setLineDash([6, 10]);
  drawScreenDivider(context, LAYOUT.rowDividerY);
  context.setLineDash([]);

  drawPriceRow(context, {
    currency: "usd",
    priceText: formatBillboardUsd(state.usd),
    changeText: formatBillboardChange(state.usdChange24h),
    tone: resolveChangeTone(state.usdChange24h),
    shouldDrawPrice: shouldDrawPrices,
  });

  drawChartSection(context, state);
  drawFooter(context, state);
};
