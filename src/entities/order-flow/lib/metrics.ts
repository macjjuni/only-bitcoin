import {
  MID_PRICE_SAMPLE_LIMIT,
  MOMENTUM_REFERENCE_IN_BPS,
  MOMENTUM_WINDOW_IN_MS,
  PRESSURE_WEIGHTS,
} from "../model/constants";
import type { VenueId, VenueMetrics } from "../model/types";

const BASIS_POINT_MULTIPLIER = 10_000;

/** 값을 하한과 상한 사이로 자른다. */
export function clampValue(value: number, minimumValue: number, maximumValue: number): number {
  return Math.min(maximumValue, Math.max(minimumValue, value));
}

/**
 * 최근 mid 가격 히스토리.
 *
 * 모멘텀은 "3초 전 대비 mid 수익률" 이라 과거 값이 필요하다. 가격 자체가 아니라 수익률만
 * 쓰므로 거래소 통화가 달라도 서로 비교할 수 있다.
 */
export class MidPriceHistory {
  private readonly timestampsInMs: number[] = [];
  private readonly pricesInQuote: number[] = [];

  add(timestampInMs: number, midPriceInQuote: number): void {
    if (midPriceInQuote <= 0) {
      return;
    }

    this.timestampsInMs.push(timestampInMs);
    this.pricesInQuote.push(midPriceInQuote);

    if (this.timestampsInMs.length > MID_PRICE_SAMPLE_LIMIT) {
      this.timestampsInMs.shift();
      this.pricesInQuote.shift();
    }
  }

  /** `MOMENTUM_WINDOW_IN_MS` 이전에 가장 가까운 mid. 없으면 0. */
  getReferencePriceInQuote(nowInMs: number): number {
    const targetTimestampInMs = nowInMs - MOMENTUM_WINDOW_IN_MS;

    for (let index = 0; index < this.timestampsInMs.length; index += 1) {
      if (this.timestampsInMs[index] >= targetTimestampInMs) {
        return this.pricesInQuote[index];
      }
    }

    return this.pricesInQuote.length > 0 ? this.pricesInQuote[0] : 0;
  }

  clear(): void {
    this.timestampsInMs.length = 0;
    this.pricesInQuote.length = 0;
  }
}

/** 단기 mid 수익률(bps)을 기준폭으로 나눠 -1 ~ 1 로 정규화한다. */
export function calculateMomentum(
  currentMidPriceInQuote: number,
  referenceMidPriceInQuote: number,
): number {
  if (currentMidPriceInQuote <= 0 || referenceMidPriceInQuote <= 0) {
    return 0;
  }

  const returnInBps =
    ((currentMidPriceInQuote - referenceMidPriceInQuote) / referenceMidPriceInQuote) *
    BASIS_POINT_MULTIPLIER;

  return clampValue(returnInBps / MOMENTUM_REFERENCE_IN_BPS, -1, 1);
}

/** 세 지표를 가중 합해 거래소 압력을 만든다. 결과는 -1 ~ 1. */
export function calculateVenuePressure(input: {
  tradePressure: number;
  bookImbalance: number;
  momentum: number;
}): number {
  const weightedPressure =
    PRESSURE_WEIGHTS.tradePressure * input.tradePressure +
    PRESSURE_WEIGHTS.bookImbalance * input.bookImbalance +
    PRESSURE_WEIGHTS.momentum * input.momentum;

  return clampValue(weightedPressure, -1, 1);
}

/**
 * 전체 압력.
 *
 * `live` 거래소의 `venuePressure` 단순 평균이다. 가격이나 거래대금을 합치지 않으므로
 * 환율이 필요 없다. 참여 거래소가 하나도 없으면 0 과 빈 목록을 준다.
 */
export function calculateAggregatePressure(venueMetricsList: VenueMetrics[]): {
  aggregatePressure: number;
  includedVenues: VenueId[];
} {
  const liveVenueMetricsList = venueMetricsList.filter(
    (venueMetrics) => venueMetrics.status === "live",
  );

  if (liveVenueMetricsList.length === 0) {
    return { aggregatePressure: 0, includedVenues: [] };
  }

  const pressureSum = liveVenueMetricsList.reduce(
    (accumulatedPressure, venueMetrics) => accumulatedPressure + venueMetrics.venuePressure,
    0,
  );

  return {
    aggregatePressure: clampValue(pressureSum / liveVenueMetricsList.length, -1, 1),
    includedVenues: liveVenueMetricsList.map((venueMetrics) => venueMetrics.venue),
  };
}
