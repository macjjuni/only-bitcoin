import { SPACE_TICKER_FRAME } from "@/entities/space";
import {
  NUMERIC_FONT_STACK,
  resolveFittedFontSize,
  resolveFontSpec,
  SANS_FONT_STACK,
  SCREEN_COLORS,
} from "./screenCanvas";

/**
 * 메인 액자 위 티커 테이프 텍스처.
 *
 * 시세판·네트워크판과 달리 한 바퀴(45 m)가 패널 폭(28 m)보다 길다. 텍스처를
 * `RepeatWrapping` 으로 걸고 `offset.x` 만 밀어 흘리므로, 칸 폭을 똑같이 나눠
 * 끝과 처음이 만나는 자리에서도 간격이 어긋나지 않게 함.
 *
 * 칸마다 따로 다시 구울 수 있게 그림(`drawTickerSlot`). 김프는 거의 매초 바뀌는데
 * 그때마다 한 바퀴를 통째로 GPU 에 올리면 한 번에 수 MB 임.
 */

/** 칸 폭이 같아야 한 바퀴 끝과 처음이 이어 붙는 자리에서 간격이 안 튄다. */
const SLOT_COUNT = 5;
/** 칸 하나의 월드 길이(m) = 지표 사이 간격. 10 m 는 지표끼리 너무 떨어져 보였음. */
const SLOT_LENGTH_METERS = 9;
/**
 * 칸 폭(px). 다섯 칸이 4000 px 라 텍스처 크기 상한이 4096 인 기기에도 그대로 올라감.
 *
 * 900 px(한 바퀴 4500 px)일 때는 그런 기기에서 올릴 때마다 줄여 그려야 했음.
 * 밀도는 약 89 px/m 로, 전광판(114 px/m)보다 조금 낮음.
 */
const SLOT_WIDTH = 800;
const PIXELS_PER_METER = SLOT_WIDTH / SLOT_LENGTH_METERS;

export const TICKER_TEXTURE = {
  width: SLOT_COUNT * SLOT_WIDTH,
  /** 가로와 같은 밀도로 잡음. 다르면 글자가 한쪽으로 늘어나 보임. */
  height: Math.round(SPACE_TICKER_FRAME.height * PIXELS_PER_METER),
  slotWidth: SLOT_WIDTH,
  slotCount: SLOT_COUNT,
  /** 한 바퀴의 월드 길이(m). 패널 폭보다 길어서 화면에는 늘 일부만 보인다. */
  cycleLength: SLOT_COUNT * SLOT_LENGTH_METERS,
  /** 칸 안쪽 여백. 값이 길어지면 이 폭에 맞춰 글자가 줄어든다. */
  slotPaddingX: 53,
} as const;

/** 초당 흐르는 거리(m). 28 m 폭을 한 글자가 지나가는 데 약 25초. */
export const TICKER_SCROLL_SPEED = 1.1;

const FONT = {
  label: 48,
  value: 80,
  /** 라벨과 값 사이. 글자 크기가 달라 이 절반으로는 한 덩어리처럼 붙어 보였음. */
  gap: 43,
  /** 값과 꼬리말 사이. 같은 값을 설명하는 말이라 라벨 간격보다 좁게 붙임. */
  suffixGap: 18,
} as const;

/** 칸 경계마다 찍는 점. 글자만 흐르면 어디서 끊기는지 안 보임. */
const DIVIDER = { radius: 6, color: SCREEN_COLORS.labelDim } as const;

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
  /**
   * 값 뒤에 붙는 한글 꼬리말.
   *
   * 숫자 글꼴(Roboto Mono·JetBrains Mono)에는 한글 글리프가 없어서 값에 한글을
   * 섞으면 그 글자만 시스템 폰트로 떨어진다. 등폭과 비례폭이 한 줄에 섞여
   * 세로 중심선까지 어긋나므로, 한글은 라벨과 같은 산세리프로 따로 그린다.
   */
  suffix?: string;
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
 * 2조 달러를 자릿수로 적으면 열세 글자라 한 칸에 안 들어감. 십억(B) 단위로만
 * 줄이면 `$1600.1B` 로 나와서 조(T) 단위까지 둠.
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

/** 한 바퀴에 들어가는 칸들. 순서는 고정이라 늘 같은 자리에서 같은 지표가 지나감. */
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
        ? String(Math.round(state.fearGreed))
        : TICKER_PLACEHOLDER,
      tone: isDisplayable(state.fearGreed) ? resolveFearGreedTone(state.fearGreed) : "flat",
      suffix: isDisplayable(state.fearGreed) ? resolveFearGreedZone(state.fearGreed) : undefined,
    },
  ];
};

/** 칸마다 다시 구울지 가리는 서명. 화면에 찍히는 글자만 모았음. */
export const createTickerSlotSignatures = (items: readonly TickerItem[]): string[] => {
  return items.map((item) => `${item.label}:${item.valueText}:${item.suffix ?? ""}:${item.tone}`);
};

/** 서명이 달라진 칸 번호. 이전 서명이 비어 있으면(처음이거나 통째로 다시 구울 때) 전부임. */
export const resolveChangedTickerSlots = (
  previousSignatures: readonly string[],
  signatures: readonly string[],
): number[] => {
  return signatures.flatMap((signature, slotIndex) =>
    signature === previousSignatures[slotIndex] ? [] : [slotIndex],
  );
};

const resolveToneColor = (tone: TickerTone): string => {
  return tone === "flat" ? SCREEN_COLORS.label : SCREEN_COLORS[tone];
};

// region [Privates]
/**
 * 글자 잉크 상자의 세로 가운데를 띠 중심에 맞추는 기준선 y.
 *
 * `textBaseline = "middle"` 은 글리프가 아니라 폰트 em 박스를 반으로 가른다.
 * 라벨(한글 산세리프 48 px)과 값(등폭 숫자 80 px)은 em 박스 안에서 글자가
 * 차지하는 위치가 서로 달라, 같은 `middle` 로 그려도 눈에는 어긋나 보였다.
 * 실제로 칠해지는 상자를 재서 그 중심을 맞춘다.
 */
const resolveCenteredBaselineY = (
  context: CanvasRenderingContext2D,
  text: string,
  centerY: number,
): number => {
  const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } =
    context.measureText(text);

  // 잉크 상자를 안 주는 환경에서는 기준선을 그대로 둔다.
  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
    return centerY;
  }

  return centerY + (ascent - descent) / 2;
};

/** 라벨 + 값을 한 덩어리로 묶어 칸 가운데에 놓는다. */
const drawSlot = (context: CanvasRenderingContext2D, item: TickerItem, slotIndex: number): void => {
  const slotCenterX = SLOT_WIDTH * (slotIndex + 0.5);
  const centerY = TICKER_TEXTURE.height / 2;
  const maxWidth = SLOT_WIDTH - TICKER_TEXTURE.slotPaddingX * 2;

  const labelFont = resolveFontSpec(500, FONT.label, SANS_FONT_STACK);
  const suffixFont = resolveFontSpec(600, FONT.label, SANS_FONT_STACK);

  // 잉크 상자를 재려면 기준선이 글리프 아래쪽(알파벳 베이스라인)이어야 한다.
  context.textBaseline = "alphabetic";
  context.textAlign = "left";

  context.font = labelFont;
  const labelWidth = context.measureText(item.label).width;

  context.font = suffixFont;
  const suffixWidth = item.suffix ? FONT.suffixGap + context.measureText(item.suffix).width : 0;

  // 가운데 정렬과 실제 그리기가 같은 폭 예산을 써야 값이 길 때도 덩어리가 안 밀린다.
  const valueMaxWidth = maxWidth - labelWidth - FONT.gap - suffixWidth;

  context.font = resolveFontSpec(700, FONT.value, NUMERIC_FONT_STACK);
  const valueFontSize = resolveFittedFontSize(context.measureText(item.valueText).width, {
    maxWidth: valueMaxWidth,
    maxFontSizePx: FONT.value,
  });

  context.font = resolveFontSpec(700, valueFontSize, NUMERIC_FONT_STACK);

  const valueWidth = context.measureText(item.valueText).width;
  const contentLeft = slotCenterX - (labelWidth + FONT.gap + valueWidth + suffixWidth) / 2;
  const valueLeft = contentLeft + labelWidth + FONT.gap;

  context.fillStyle = resolveToneColor(item.tone);
  context.fillText(
    item.valueText,
    valueLeft,
    resolveCenteredBaselineY(context, item.valueText, centerY),
  );

  context.font = labelFont;
  context.fillStyle = SCREEN_COLORS.labelMuted;
  context.fillText(item.label, contentLeft, resolveCenteredBaselineY(context, item.label, centerY));

  if (item.suffix) {
    context.font = suffixFont;
    context.fillText(
      item.suffix,
      valueLeft + valueWidth + FONT.suffixGap,
      resolveCenteredBaselineY(context, item.suffix, centerY),
    );
  }
};

/** 칸 경계 점 하나. 가운데가 경계선 위라 양옆 칸에 반씩 걸친다. */
const drawDivider = (context: CanvasRenderingContext2D, centerX: number): void => {
  context.fillStyle = DIVIDER.color;
  context.beginPath();
  context.arc(centerX, TICKER_TEXTURE.height / 2, DIVIDER.radius, 0, Math.PI * 2);
  context.fill();
};
// endregion

/**
 * 칸 하나를 다시 그린다. 그 칸 밖은 건드리지 않는다.
 *
 * 경계 점은 양옆 칸에 반씩 걸쳐 있어서 이 칸 쪽 반만 다시 찍는다. 잘라 내지 않고 점을
 * 통째로 찍으면 옆 칸의 반쪽이 덧칠돼 가장자리가 진해진다. 맨 앞 칸의 왼쪽 반과 맨 끝
 * 칸의 오른쪽 반은 텍스처 밖이고, 반복될 때 서로 이어 붙어 한 점이 된다.
 */
export const drawTickerSlot = (
  context: CanvasRenderingContext2D,
  item: TickerItem,
  slotIndex: number,
): void => {
  const left = SLOT_WIDTH * slotIndex;

  context.save();
  context.beginPath();
  context.rect(left, 0, SLOT_WIDTH, TICKER_TEXTURE.height);
  context.clip();

  context.fillStyle = SCREEN_COLORS.backdrop;
  context.fillRect(left, 0, SLOT_WIDTH, TICKER_TEXTURE.height);
  drawDivider(context, left);
  drawDivider(context, left + SLOT_WIDTH);
  drawSlot(context, item, slotIndex);

  context.restore();
};
