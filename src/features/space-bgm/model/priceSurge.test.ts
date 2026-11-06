import { describe, expect, it } from "vitest";
import {
  appendPriceSample,
  createSurgeState,
  readSurgeChangePercent,
  SPACE_BGM_SURGE,
  type SurgeState,
  seedPriceSamples,
  stepSurgeState,
  toPriceSamples,
} from "./priceSurge";

const START_MS = 1_700_000_000_000;

/**
 * 창을 꽉 채운 상태를 만든다.
 *
 * 마지막 값만 바꿔 변동률을 원하는 대로 만들 수 있게, 끝에서 두 번째까지는
 * 같은 가격으로 채운다.
 */
const createFilledState = (startPrice = 100_000): SurgeState => {
  const samples = [];

  for (let atMs = START_MS; atMs <= START_MS + SPACE_BGM_SURGE.windowMs; atMs += 60_000) {
    samples.push({ atMs, price: startPrice });
  }

  return seedPriceSamples(createSurgeState(), samples);
};

/** 창 끝에 가격 하나를 더해 변동률을 만든다. 돌려주는 시각으로 상태기계를 돌린다. */
const pushChange = (state: SurgeState, changePercent: number) => {
  const first = state.samples[0];
  const nextAtMs = (state.samples.at(-1)?.atMs ?? START_MS) + SPACE_BGM_SURGE.sampleIntervalMs;
  const nextPrice = first.price * (1 + changePercent / 100);

  return { state: appendPriceSample(state, nextPrice, nextAtMs), nowMs: nextAtMs };
};

describe("급등락 판정", () => {
  it("창을 못 채우면 판정하지 않는다", () => {
    let state = createSurgeState();
    state = appendPriceSample(state, 100_000, START_MS);
    state = appendPriceSample(state, 108_000, START_MS + 60_000);

    // 8% 가 움직였어도 1분치라 15분 변동률이라고 말할 수 없다.
    expect(readSurgeChangePercent(state, START_MS + 60_000)).toBeNull();
    expect(stepSurgeState(state, START_MS + 60_000).isSurging).toBe(false);
  });

  it("창을 채우면 변동률을 낸다", () => {
    const { state, nowMs } = pushChange(createFilledState(), 2);

    expect(readSurgeChangePercent(state, nowMs)).toBeCloseTo(2, 5);
  });

  it("시세가 끊기면 판정을 멈춘다", () => {
    const { state, nowMs } = pushChange(createFilledState(), 2);
    const staleMs = nowMs + SPACE_BGM_SURGE.stalePriceMs + 1;

    expect(readSurgeChangePercent(state, staleMs)).toBeNull();
  });

  it("샘플 간격보다 촘촘한 값은 버린다", () => {
    let state = createSurgeState();
    state = appendPriceSample(state, 100_000, START_MS);
    state = appendPriceSample(state, 999_999, START_MS + 1_000);

    expect(state.samples).toHaveLength(1);
  });

  it("창 밖으로 나간 샘플은 버린다", () => {
    const state = createFilledState();
    const latestAtMs = state.samples.at(-1)?.atMs ?? 0;

    expect(state.samples[0].atMs).toBeGreaterThanOrEqual(
      latestAtMs - SPACE_BGM_SURGE.windowMs - SPACE_BGM_SURGE.sampleIntervalMs * 2,
    );
  });

  describe("상태기계", () => {
    it("진입 기준을 넘으면 급등락으로 들어간다", () => {
      const { state, nowMs } = pushChange(createFilledState(), SPACE_BGM_SURGE.enterPercent);

      expect(stepSurgeState(state, nowMs).isSurging).toBe(true);
    });

    it("방향을 가리지 않는다 — 급락도 같게 본다", () => {
      const { state, nowMs } = pushChange(createFilledState(), -SPACE_BGM_SURGE.enterPercent);

      expect(stepSurgeState(state, nowMs).isSurging).toBe(true);
    });

    it("진입과 해제 사이 값에서는 상태가 유지된다", () => {
      const entered = pushChange(createFilledState(), SPACE_BGM_SURGE.enterPercent);
      const surging = stepSurgeState(entered.state, entered.nowMs);
      // 진입(1.0%)과 해제(0.5%) 사이. 하나짜리 임계치였다면 여기서 풀려 깜빡였다.
      const between = pushChange(surging, 0.7);
      const heldMs = between.nowMs + SPACE_BGM_SURGE.minHoldMs;

      expect(stepSurgeState(between.state, heldMs).isSurging).toBe(true);
    });

    it("최소 유지 시간 전에는 잠잠해져도 풀리지 않는다", () => {
      const entered = pushChange(createFilledState(), SPACE_BGM_SURGE.enterPercent);
      const surging = stepSurgeState(entered.state, entered.nowMs);
      const calmed = pushChange(surging, 0);

      expect(stepSurgeState(calmed.state, calmed.nowMs).isSurging).toBe(true);
    });

    it("최소 유지 시간을 넘기고 잠잠해지면 풀린다", () => {
      const entered = pushChange(createFilledState(), SPACE_BGM_SURGE.enterPercent);
      const surging = stepSurgeState(entered.state, entered.nowMs);
      const calmed = pushChange(surging, 0);
      const heldMs = calmed.nowMs + SPACE_BGM_SURGE.minHoldMs;

      expect(stepSurgeState(calmed.state, heldMs).isSurging).toBe(false);
    });

    it("쿨다운 중에는 다시 발동하지 않는다", () => {
      const released: SurgeState = {
        ...createFilledState(),
        isSurging: false,
        endedAtMs: START_MS + SPACE_BGM_SURGE.windowMs,
      };
      const { state, nowMs } = pushChange(released, SPACE_BGM_SURGE.enterPercent * 2);

      expect(nowMs - released.endedAtMs).toBeLessThan(SPACE_BGM_SURGE.cooldownMs);
      expect(stepSurgeState(state, nowMs).isSurging).toBe(false);
    });

    it("쿨다운이 지나면 다시 발동한다", () => {
      const released: SurgeState = {
        ...createFilledState(),
        isSurging: false,
        endedAtMs: Number.NEGATIVE_INFINITY,
      };
      const { state, nowMs } = pushChange(released, SPACE_BGM_SURGE.enterPercent);

      expect(stepSurgeState(state, nowMs).isSurging).toBe(true);
    });

    it("재생 중 시세가 끊기면 최소 유지 뒤 기본 트랙으로 돌아온다", () => {
      const entered = pushChange(createFilledState(), SPACE_BGM_SURGE.enterPercent);
      const surging = stepSurgeState(entered.state, entered.nowMs);
      const staleMs = entered.nowMs + SPACE_BGM_SURGE.stalePriceMs + SPACE_BGM_SURGE.minHoldMs;

      expect(readSurgeChangePercent(surging, staleMs)).toBeNull();
      expect(stepSurgeState(surging, staleMs).isSurging).toBe(false);
    });
  });

  it("1분봉을 창 샘플로 바꾼다", () => {
    const samples = toPriceSamples([
      { openTime: START_MS, open: 100, high: 101, low: 99, close: 100.5, quoteVolume: 1 },
    ]);

    expect(samples).toEqual([{ atMs: START_MS, price: 100 }]);
  });
});
