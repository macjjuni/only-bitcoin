import { describe, expect, it } from "vitest";
import type { BtcCandle } from "@/entities/bitcoin";
import {
  appendPriceSample,
  createSurgeState,
  readCalmChangePercent,
  readCandleChangePercent,
  resolveReferencePrice,
  SPACE_BGM_SURGE,
  type SurgeState,
  stepSurgeState,
} from "./marketSurge";

const { candleIntervalMs, sampleIntervalMs } = SPACE_BGM_SURGE;
/** 30분봉 경계에 맞춘 시각. 여기서 새 봉이 시작함. */
const CANDLE_START_MS = Math.ceil(1_700_000_000_000 / candleIntervalMs) * candleIntervalMs;
const REFERENCE_PRICE = 100_000;

const createCandle = (openTime: number, open: number, close: number): BtcCandle => ({
  openTime,
  open,
  high: Math.max(open, close),
  low: Math.min(open, close),
  close,
  quoteVolume: 0,
});

/** `fromMs` 부터 `toMs` 까지 샘플 간격마다 같은 가격을 넣음. */
const fillFlat = (state: SurgeState, price: number, fromMs: number, toMs: number): SurgeState => {
  let next = state;

  for (let atMs = fromMs; atMs <= toMs; atMs += sampleIntervalMs) {
    next = appendPriceSample(next, price, atMs);
  }

  return next;
};

const priceAt = (changePercent: number): number => REFERENCE_PRICE * (1 + changePercent / 100);

describe("기준가", () => {
  const previous = createCandle(CANDLE_START_MS - candleIntervalMs, 99_000, 99_500);

  it("지금 봉이 있으면 그 시가를 씀", () => {
    const current = createCandle(CANDLE_START_MS, 99_600, 100_200);

    expect(resolveReferencePrice([previous, current], CANDLE_START_MS + 60_000)).toBe(99_600);
  });

  it("지금 봉을 아직 못 받았으면 이전 봉 종가를 씀", () => {
    expect(resolveReferencePrice([previous], CANDLE_START_MS + 60_000)).toBe(99_500);
  });

  it("두 봉 다 없으면 판정하지 않음", () => {
    expect(resolveReferencePrice([previous], CANDLE_START_MS + candleIntervalMs)).toBeNull();
    expect(resolveReferencePrice([], CANDLE_START_MS)).toBeNull();
  });
});

describe("변동률", () => {
  it("이전 봉 종가 대비로 잼", () => {
    const state = appendPriceSample(createSurgeState(), priceAt(0.6), CANDLE_START_MS);

    expect(readCandleChangePercent(state, REFERENCE_PRICE, CANDLE_START_MS)).toBeCloseTo(0.6);
  });

  it("시세가 끊겼으면 0 이 아니라 null", () => {
    const state = appendPriceSample(createSurgeState(), priceAt(1), CANDLE_START_MS);
    const staleMs = CANDLE_START_MS + SPACE_BGM_SURGE.stalePriceMs + 1;

    expect(readCandleChangePercent(state, REFERENCE_PRICE, staleMs)).toBeNull();
    expect(readCalmChangePercent(state, staleMs)).toBeNull();
  });

  it("최근 5분 변동은 5분 전 샘플과 비교함", () => {
    let state = fillFlat(
      createSurgeState(),
      REFERENCE_PRICE,
      CANDLE_START_MS,
      CANDLE_START_MS + 10 * 60_000,
    );
    const nowMs = CANDLE_START_MS + 10 * 60_000 + sampleIntervalMs;
    state = appendPriceSample(state, priceAt(0.2), nowMs);

    expect(readCalmChangePercent(state, nowMs)).toBeCloseTo(0.2);
  });

  it("너무 촘촘한 샘플은 버림", () => {
    const state = appendPriceSample(createSurgeState(), REFERENCE_PRICE, CANDLE_START_MS);

    expect(appendPriceSample(state, priceAt(5), CANDLE_START_MS + 1_000)).toBe(state);
  });
});

describe("급등락 판정", () => {
  it("이전 봉 종가 대비 ±0.6% 부터 켜고 방향은 가리지 않음", () => {
    const nowMs = CANDLE_START_MS + 60_000;
    const below = appendPriceSample(createSurgeState(), priceAt(0.59), nowMs);
    const up = appendPriceSample(createSurgeState(), priceAt(0.6), nowMs);
    const down = appendPriceSample(createSurgeState(), priceAt(-0.6), nowMs);

    expect(stepSurgeState(below, REFERENCE_PRICE, nowMs).isSurging).toBe(false);
    expect(stepSurgeState(up, REFERENCE_PRICE, nowMs).isSurging).toBe(true);
    expect(stepSurgeState(down, REFERENCE_PRICE, nowMs).isSurging).toBe(true);
  });

  it("기준가를 모르면 켜지 않음", () => {
    const state = appendPriceSample(createSurgeState(), priceAt(3), CANDLE_START_MS);

    expect(stepSurgeState(state, null, CANDLE_START_MS).isSurging).toBe(false);
  });

  it("새 봉이 시작돼도 최근 5분이 출렁이면 유지함", () => {
    // 이전 봉 끝에서 +0.6% 로 켜짐.
    const enteredAtMs = CANDLE_START_MS - 3 * 60_000;
    let state = fillFlat(
      createSurgeState(),
      REFERENCE_PRICE,
      enteredAtMs - 5 * 60_000,
      enteredAtMs - sampleIntervalMs,
    );
    state = appendPriceSample(state, priceAt(0.6), enteredAtMs);
    state = stepSurgeState(state, REFERENCE_PRICE, enteredAtMs);
    expect(state.isSurging).toBe(true);

    // 새 봉이 시작되면 기준가가 현재가가 돼 봉 변동은 0 이지만, 5분 전보다 0.6% 위임.
    const newReference = priceAt(0.6);
    const afterBoundaryMs = CANDLE_START_MS + sampleIntervalMs;
    state = fillFlat(state, newReference, enteredAtMs + sampleIntervalMs, afterBoundaryMs);
    state = stepSurgeState(state, newReference, afterBoundaryMs);

    expect(state.isSurging).toBe(true);
  });

  it("봉 변동이 가라앉고 최근 5분도 잠잠하면 끔", () => {
    let state = appendPriceSample(createSurgeState(), priceAt(0.6), CANDLE_START_MS);
    state = stepSurgeState(state, REFERENCE_PRICE, CANDLE_START_MS);
    const calmUntilMs = CANDLE_START_MS + 6 * 60_000;
    state = fillFlat(state, priceAt(0.3), CANDLE_START_MS + sampleIntervalMs, calmUntilMs);
    state = stepSurgeState(state, REFERENCE_PRICE, calmUntilMs);

    expect(state.isSurging).toBe(false);
    expect(state.endedAtMs).toBe(calmUntilMs);
  });

  it("봉 변동이 해제선 위면 잠잠해도 유지함", () => {
    let state = appendPriceSample(createSurgeState(), priceAt(0.6), CANDLE_START_MS);
    state = stepSurgeState(state, REFERENCE_PRICE, CANDLE_START_MS);
    const untilMs = CANDLE_START_MS + 6 * 60_000;
    state = fillFlat(state, priceAt(0.31), CANDLE_START_MS + sampleIntervalMs, untilMs);

    expect(stepSurgeState(state, REFERENCE_PRICE, untilMs).isSurging).toBe(true);
  });

  it("켜진 뒤 2분은 잠잠해져도 유지함", () => {
    let state = appendPriceSample(createSurgeState(), priceAt(0.6), CANDLE_START_MS);
    state = stepSurgeState(state, REFERENCE_PRICE, CANDLE_START_MS);
    const beforeHoldMs = CANDLE_START_MS + SPACE_BGM_SURGE.minHoldMs - sampleIntervalMs;
    state = fillFlat(state, REFERENCE_PRICE, CANDLE_START_MS + sampleIntervalMs, beforeHoldMs);

    expect(stepSurgeState(state, REFERENCE_PRICE, beforeHoldMs).isSurging).toBe(true);
  });

  it("시세가 끊기면 최소 유지 뒤 기본 트랙으로 돌아감", () => {
    let state = appendPriceSample(createSurgeState(), priceAt(1), CANDLE_START_MS);
    state = stepSurgeState(state, REFERENCE_PRICE, CANDLE_START_MS);
    const staleMs = CANDLE_START_MS + SPACE_BGM_SURGE.stalePriceMs + 1;

    expect(stepSurgeState(state, REFERENCE_PRICE, staleMs).isSurging).toBe(false);
  });

  it("끈 뒤 10분은 다시 켜지 않음", () => {
    const endedAtMs = CANDLE_START_MS;
    const surging = appendPriceSample(
      { ...createSurgeState(), endedAtMs },
      priceAt(1),
      endedAtMs + SPACE_BGM_SURGE.cooldownMs - sampleIntervalMs,
    );
    const cooledDownAtMs = endedAtMs + SPACE_BGM_SURGE.cooldownMs;

    expect(
      stepSurgeState(surging, REFERENCE_PRICE, cooledDownAtMs - sampleIntervalMs).isSurging,
    ).toBe(false);
    expect(stepSurgeState(surging, REFERENCE_PRICE, cooledDownAtMs).isSurging).toBe(true);
  });
});
