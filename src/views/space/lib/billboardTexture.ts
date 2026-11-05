import type { BtcCandle } from "@/entities/bitcoin";
import { drawBitcoinCoin } from "@/shared/lib/bitcoinIconCanvas";
import { type ChartRect, resolveChartScale, resolveTickY } from "./billboardChart";
import {
  drawFittedText,
  drawScreenCard,
  drawScreenDivider,
  drawScreenLiveBadge,
  NUMERIC_FONT_STACK,
  resolveFontSpec,
  SANS_FONT_STACK,
  SCREEN_COLORS,
  SCREEN_HEADLINE_FONT_SIZE_PX,
  SCREEN_LIVE_BADGE,
  SCREEN_MIN_FONT_SIZE_PX,
  SCREEN_TEXTURE,
} from "./screenCanvas";

export { resolveFittedFontSize, type TextFitOptions } from "./screenCanvas";

/**
 * 메인 전광판 왼쪽 칸, 비트코인 시세 텍스처.
 *
 * 시안(`assets/screen_A.png`)은 달러 하나만 크게 띄웠는데 원화도 같은 무게로
 * 보여야 해서 가격을 두 줄로 나눴음. 원화는 브랜드 주황, 달러는 크림색으로 갈라
 * 멀리서도 어느 줄이 어느 통화인지 색으로 먼저 읽힘. 통화 꼬리표(KRW·USD)는
 * 폰에서 안 읽혀서 뺐고, ₩·$ 기호와 색으로 구분함. 그 아래는 30분봉 캔들과
 * 거래대금 막대가 패널 아래쪽을 채움.
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
export const BILLBOARD_ONLINE_MARKER = SCREEN_LIVE_BADGE.marker;

/** 가격·등락률 칸의 최대 폭. 넘으면 글자를 줄임. */
export const BILLBOARD_COLUMNS = {
  priceMaxWidth: 1080,
  changeMaxWidth: 240,
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
 * 세로 예산: 헤더 200 · 가격 두 줄 340 · 차트 620. 하단 지표(고가·저가 등)는
 * 빼고 그 자리까지 차트를 키웠음. 가격 두 줄이
 * 같은 크기라 원화가 열두 글자(₩145,230,000)여도 1,080 px 칸에 들어감. 132 px 는
 * 너무 커 보여서 120 px(`SCREEN_HEADLINE_FONT_SIZE_PX`)까지 줄였음.
 *
 * 라벨은 34 px 아래로 두지 않음. 폰에서는 패널이 600 px 안팎으로 줄어 28 px
 * 라벨이 7 px 로 보여 못 읽었음.
 */
const LAYOUT = {
  logo: { centerX: 138, centerY: 126, radius: 54 },
  title: { x: 216, y: 108, fontSize: 56 },
  subtitle: { x: 218, y: 164, fontSize: 34 },
  rows: {
    krw: { centerY: 290 },
    usd: { centerY: 450 },
  },
  rowDividerY: 370,
  rowPrice: {
    x: 84,
    fontSize: SCREEN_HEADLINE_FONT_SIZE_PX,
    maxWidth: BILLBOARD_COLUMNS.priceMaxWidth,
    height: 160,
  },
  /** 폰에서도 읽히게 키웠음. `+12.3%` 가 칸에 들어가는 폭임. */
  rowChange: { right: 1516, width: 320, height: 100, radius: 18, fontSize: 60 },
  chartCaption: { x: 84, y: 548, fontSize: 34 },
  chart: { left: 84, top: 590, width: 1432, height: 430 } satisfies ChartRect,
  /** 끝점 점과 펄스가 앉을 오른쪽 여백. 캔들은 이 앞에서 끝남. */
  chartEndGutter: 56,
  volume: { top: 1040, height: 110 },
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

/**
 * 별도 차트 텍스처가 덮는 칸. 캔들·거래대금 막대·현재가 점선과 점이 다 들어감.
 *
 * 캡션은 바뀌지 않아서 큰 텍스처에 남김.
 */
export const BILLBOARD_CHART_REGION: BillboardPriceRegion = {
  x: LAYOUT.chart.left - 20,
  y: LAYOUT.chart.top - 20,
  width: LAYOUT.chart.width + 40,
  height: LAYOUT.volume.top + LAYOUT.volume.height - LAYOUT.chart.top + 40,
};

/** 기본 전광판과 별도 가격 텍스처가 같은 칸을 쓰도록 레이아웃에서 계산함. */
export const BILLBOARD_PRICE_REGIONS = {
  krw: createBillboardPriceRegion(LAYOUT.rows.krw.centerY),
  usd: createBillboardPriceRegion(LAYOUT.rows.usd.centerY),
} as const;

/** 등락이 0.0% 일 때의 통화별 가격 색. 원화는 주황, 달러는 크림. */
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

/**
 * 소수 첫째 자리까지 반올림한 등락률.
 *
 * 전광판에서는 둘째 자리가 멀리서 안 읽혀서 한 자리로 줄였음. 자리수를 고정해야
 * 4 Hz 갱신 때 글자가 안 떪.
 */
const roundChange = (change: string | number): number | null => {
  const parsed = parseChange(change);

  return parsed === null ? null : Math.round(parsed * 10) / 10;
};

export const formatBillboardChange = (change: string | number): string => {
  const rounded = roundChange(change);

  if (rounded === null) {
    return BILLBOARD_PLACEHOLDER;
  }
  if (rounded === 0) {
    return "0.0%";
  }

  return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded).toFixed(1)}%`;
};

/** 표시값 기준 톤. `0.0%` 인데 화살표가 오르내리면 어색해서 반올림한 값으로 가름. */
export const resolveChangeTone = (change: string | number): BillboardTone => {
  const parsed = roundChange(change);

  if (parsed === null || parsed === 0) {
    return "flat";
  }

  return parsed > 0 ? "up" : "down";
};

export const resolveToneColor = (tone: BillboardTone): string => {
  return BILLBOARD_COLORS[tone];
};

/** 가격 글자 색. 24시간 등락에 따라 초록·빨강으로 바꾸고, 보합이면 통화 색을 씀. */
export const resolvePriceColor = (currency: BillboardCurrency, tone: BillboardTone): string => {
  return tone === "flat" ? PRICE_COLORS[currency] : resolveToneColor(tone);
};

/**
 * 전광판 접속 표시 기준.
 *
 * 한쪽 피드만 살아 있어도 LIVE 로 봄. 숫자가 눈앞에서 바뀌는데 "OFFLINE"
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
  color: string,
  x: number,
  y: number,
): void => {
  context.fillStyle = color;
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

  drawScreenLiveBadge(context, isOnline ? "live" : "offline");
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
  const { centerY } = LAYOUT.rows[currency];
  // 시세가 아직 없으면 변동률 0.00% 도 의미가 없음. 같이 비워 둠.
  const hasPrice = priceText !== BILLBOARD_PLACEHOLDER;
  const tone = hasPrice ? options.tone : "flat";
  const changeText = hasPrice ? options.changeText : BILLBOARD_PLACEHOLDER;

  if (options.shouldDrawPrice) {
    context.textAlign = "left";
    context.textBaseline = "middle";
    drawPriceText(
      context,
      priceText,
      resolvePriceColor(currency, tone),
      LAYOUT.rowPrice.x,
      centerY,
    );
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

const drawChartCaption = (context: CanvasRenderingContext2D): void => {
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.chartCaption.fontSize, SANS_FONT_STACK);
  context.fillText("최근 24시간 · BTC/USDT 30분봉", LAYOUT.chartCaption.x, LAYOUT.chartCaption.y);
};

/** 차트 본문. 좌표는 전체 텍스처 기준이라 별도 차트 텍스처에서는 원점을 옮겨 부름. */
const drawChartBody = (
  context: CanvasRenderingContext2D,
  state: Pick<BillboardState, "candles" | "usdChange24h">,
): void => {
  const geometry = resolveBillboardChartGeometry(state);

  if (!geometry) {
    drawChartPlaceholder(context);
    return;
  }

  drawChartGrid(context, geometry.scale);
  drawCandles(context, geometry);
  drawCurrentPriceMarker(context, geometry.endpoint, geometry.tone);
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
  tone: BillboardTone,
): void => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.textAlign = "left";
  context.textBaseline = "middle";
  drawPriceText(
    context,
    priceText,
    resolvePriceColor(currency, tone),
    0,
    LAYOUT.rowPrice.height / 2,
  );
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
  options: { shouldDrawPrices?: boolean; shouldDrawChart?: boolean } = {},
): void => {
  const shouldDrawPrices = options.shouldDrawPrices ?? true;
  const shouldDrawChart = options.shouldDrawChart ?? true;

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

  drawChartCaption(context);

  if (shouldDrawChart) {
    drawChartBody(context, state);
  }
};

/**
 * 별도 차트 텍스처에 차트만 그림.
 *
 * 캔들은 2초마다 자라는데 큰 텍스처(1600 × 1200)를 매번 다시 올리면 모바일에서
 * 무거움. 차트 칸만 떼어 투명 텍스처로 겹치고 이것만 다시 올림.
 */
export const drawBillboardChart = (
  context: CanvasRenderingContext2D,
  state: Pick<BillboardState, "candles" | "usdChange24h">,
): void => {
  const { x, y } = BILLBOARD_CHART_REGION;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(1, 0, 0, 1, -x, -y);
  drawChartBody(context, state);
  context.setTransform(1, 0, 0, 1, 0, 0);
};
