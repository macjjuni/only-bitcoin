import {
  drawFittedText,
  NUMERIC_FONT_STACK,
  resolveFontSpec,
  SANS_FONT_STACK,
  SCREEN_COLORS,
} from "./screenCanvas";

/**
 * 메인 액자 위 티커 테이프 텍스처.
 *
 * 시세판·네트워크판과 달리 한 바퀴(40 m)가 패널 폭(28 m)보다 길다. 텍스처를
 * `RepeatWrapping` 으로 걸고 `offset.x` 만 밀어 흘리므로, 칸 폭을 똑같이 나눠
 * 끝과 처음이 만나는 자리에서도 간격이 어긋나지 않게 함.
 */

/** 칸 폭이 같아야 한 바퀴 끝과 처음이 이어 붙는 자리에서 간격이 안 튄다. */
const SLOT_COUNT = 5;
const SLOT_WIDTH = 1000;
/** 100 px/m. 전광판(114 px/m)과 비슷한 밀도임. */
const PIXELS_PER_METER = 100;

export const TICKER_TEXTURE = {
  width: SLOT_COUNT * SLOT_WIDTH,
  height: 200,
  slotCount: SLOT_COUNT,
  /** 한 바퀴의 월드 길이(m). 패널 폭보다 길어서 화면에는 늘 일부만 보인다. */
  cycleLength: (SLOT_COUNT * SLOT_WIDTH) / PIXELS_PER_METER,
  /** 칸 안쪽 여백. 값이 길어지면 이 폭에 맞춰 글자가 줄어든다. */
  slotPaddingX: 60,
} as const;

/** 초당 흐르는 거리(m). 28 m 폭을 한 글자가 지나가는 데 약 25초. */
export const TICKER_SCROLL_SPEED = 1.1;

const FONT = {
  label: 54,
  value: 90,
  /** 라벨과 값 사이. 글자 크기가 달라 24 px 로는 한 덩어리처럼 붙어 보였음. */
  gap: 48,
} as const;

/** 칸 경계마다 찍는 점. 글자만 흐르면 어디서 끊기는지 안 보임. */
const DIVIDER = { radius: 7, color: SCREEN_COLORS.labelDim } as const;

export type TickerTone = "up" | "down" | "flat";

export interface TickerState {
  /** BTC 시가총액 점유율(%). 모르면 `null`. */
  dominance: number | null;
  /** BTC 시가총액(달러). 모르면 `null`. */
  marketCapUsd: number | null;
  /** 김치 프리미엄(%). 0 도 실제 값이라 모를 때만 `null`. */
  premium: number | null;
  /** USD/KRW 환율. 모르면 `null`. */
  exRate: number | null;
  /** 공포·탐욕 지수(0~100). 모르면 `null`. */
  fearGreed: number | null;
}

export interface TickerItem {
  label: string;
  valueText: string;
  tone: TickerTone;
}

/** 값이 아직 없을 때. 칸을 비우면 간격이 어긋나므로 자리는 지킨다. */
export const TICKER_PLACEHOLDER = "—";

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const PREMIUM_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 환율은 소수 자리가 멀리서 안 읽히고 1원 미만은 의미도 없어 정수로 둠. */
const EXCHANGE_RATE_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * 시가총액 축약 표기.
 *
 * 2조 달러를 자릿수로 적으면 열세 글자라 한 칸에 안 들어감. 기존
 * `formatUsdVolume` 은 조 단위가 없어 `$1600.1B` 로 나와서 따로 둠.
 */
export const formatMarketCapUsd = (marketCapUsd: number): string => {
  if (marketCapUsd >= 1_000_000_000_000) {
    return `$${(marketCapUsd / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (marketCapUsd >= 1_000_000_000) {
    return `$${(marketCapUsd / 1_000_000_000).toFixed(1)}B`;
  }

  return `$${Math.round(marketCapUsd).toLocaleString("en-US")}`;
};

// region [Privates]
const isDisplayable = (value: number | null): value is number => {
  return value !== null && Number.isFinite(value);
};

const resolveSignTone = (value: number): TickerTone => {
  if (value === 0) {
    return "flat";
  }

  return value > 0 ? "up" : "down";
};
// endregion

/**
 * 공포·탐욕 구간 이름. 숫자만 있으면 72 가 높은 건지 낮은 건지 안 읽힌다.
 *
 * 경계는 alternative.me 가 `value_classification` 으로 돌려주는 다섯 구간과
 * 맞췄음(Extreme Fear·Fear·Neutral·Greed·Extreme Greed). 여기서 임의로 나누면
 * 오버뷰 화면이 띄우는 공식 지수 이미지와 글자가 어긋남.
 */
export const resolveFearGreedZone = (index: number): string => {
  if (index < 25) {
    return "극단적 공포";
  }
  if (index < 47) {
    return "공포";
  }
  if (index < 55) {
    return "중립";
  }

  return index < 75 ? "탐욕" : "극단적 탐욕";
};

/**
 * 공포·탐욕 색.
 *
 * 공포는 빨강, 탐욕은 초록. 등락 색과 같은 축이라 멀리서 숫자를 못 읽어도
 * 분위기는 전해짐.
 */
export const resolveFearGreedTone = (index: number): TickerTone => {
  if (index < 47) {
    return "down";
  }

  return index >= 55 ? "up" : "flat";
};

/** 한 바퀴에 들어가는 네 칸. 순서는 고정이라 늘 같은 자리에서 같은 지표가 지나감. */
export const resolveTickerItems = (state: TickerState): TickerItem[] => {
  return [
    {
      label: "도미넌스",
      valueText: isDisplayable(state.dominance)
        ? `${PERCENT_FORMATTER.format(state.dominance)}%`
        : TICKER_PLACEHOLDER,
      tone: "flat",
    },
    {
      label: "시가총액",
      valueText: isDisplayable(state.marketCapUsd)
        ? formatMarketCapUsd(state.marketCapUsd)
        : TICKER_PLACEHOLDER,
      tone: "flat",
    },
    {
      label: "김프",
      valueText: isDisplayable(state.premium)
        ? `${state.premium > 0 ? "+" : ""}${PREMIUM_FORMATTER.format(state.premium)}%`
        : TICKER_PLACEHOLDER,
      tone: isDisplayable(state.premium) ? resolveSignTone(state.premium) : "flat",
    },
    {
      label: "USD/KRW",
      valueText: isDisplayable(state.exRate)
        ? EXCHANGE_RATE_FORMATTER.format(state.exRate)
        : TICKER_PLACEHOLDER,
      tone: "flat",
    },
    {
      label: "공포·탐욕",
      valueText: isDisplayable(state.fearGreed)
        ? `${Math.round(state.fearGreed)} ${resolveFearGreedZone(state.fearGreed)}`
        : TICKER_PLACEHOLDER,
      tone: isDisplayable(state.fearGreed) ? resolveFearGreedTone(state.fearGreed) : "flat",
    },
  ];
};

/** 다시 구울지 가리는 서명. 화면에 찍히는 글자만 모았음. */
export const createTickerSignature = (items: readonly TickerItem[]): string => {
  return items.map((item) => `${item.label}:${item.valueText}:${item.tone}`).join("|");
};

const resolveToneColor = (tone: TickerTone): string => {
  return tone === "flat" ? SCREEN_COLORS.label : SCREEN_COLORS[tone];
};

// region [Privates]
/** 라벨 + 값을 한 덩어리로 묶어 칸 가운데에 놓는다. */
const drawSlot = (context: CanvasRenderingContext2D, item: TickerItem, slotIndex: number): void => {
  const slotCenterX = SLOT_WIDTH * (slotIndex + 0.5);
  const centerY = TICKER_TEXTURE.height / 2;
  const maxWidth = SLOT_WIDTH - TICKER_TEXTURE.slotPaddingX * 2;

  context.textBaseline = "middle";
  context.textAlign = "left";

  context.font = resolveFontSpec(500, FONT.label, SANS_FONT_STACK);
  const labelWidth = context.measureText(item.label).width;

  context.font = resolveFontSpec(700, FONT.value, NUMERIC_FONT_STACK);
  // 가운데 정렬과 실제 그리기가 같은 폭 예산을 써야 값이 길 때도 덩어리가 안 밀린다.
  const valueMaxWidth = maxWidth - labelWidth - FONT.gap;
  const valueWidth = Math.min(context.measureText(item.valueText).width, valueMaxWidth);
  const contentLeft = slotCenterX - (labelWidth + FONT.gap + valueWidth) / 2;

  context.fillStyle = SCREEN_COLORS.labelMuted;
  context.font = resolveFontSpec(500, FONT.label, SANS_FONT_STACK);
  context.fillText(item.label, contentLeft, centerY + 2);

  context.fillStyle = resolveToneColor(item.tone);
  drawFittedText(context, item.valueText, {
    x: contentLeft + labelWidth + FONT.gap,
    y: centerY,
    fontWeight: 700,
    maxFontSizePx: FONT.value,
    maxWidth: valueMaxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });
};

const drawDivider = (context: CanvasRenderingContext2D, slotIndex: number): void => {
  context.beginPath();
  context.arc(SLOT_WIDTH * slotIndex, TICKER_TEXTURE.height / 2, DIVIDER.radius, 0, Math.PI * 2);
  context.fillStyle = DIVIDER.color;
  context.fill();
};
// endregion

/** 티커 한 바퀴를 그린다. 왼쪽 끝과 오른쪽 끝이 이어 붙는다. */
export const drawTicker = (
  context: CanvasRenderingContext2D,
  items: readonly TickerItem[],
): void => {
  context.fillStyle = SCREEN_COLORS.backdrop;
  context.fillRect(0, 0, TICKER_TEXTURE.width, TICKER_TEXTURE.height);

  items.slice(0, TICKER_TEXTURE.slotCount).forEach((item, slotIndex) => {
    drawDivider(context, slotIndex);
    drawSlot(context, item, slotIndex);
  });
};
