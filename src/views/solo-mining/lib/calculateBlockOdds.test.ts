import { describe, expect, it } from "vitest";
import {
  calculateBlockFindProbability,
  calculateExpectedSecondsToFindBlock,
  calculateMedianSecondsToFindBlock,
  calculateNetworkShareRatio,
} from "./calculateBlockOdds";

const DIFFICULTY = 1.4e14;
const BITAXE_GAMMA_HASHRATE = 1.2e12; // 1.2 TH/s
const NERD_MINER_HASHRATE = 7.8e4; // 78 KH/s

describe("calculateExpectedSecondsToFindBlock", () => {
  it("난이도 × 2³² / 해시레이트 로 평균 소요 시간을 구한다", () => {
    const expectedSeconds = calculateExpectedSecondsToFindBlock(BITAXE_GAMMA_HASHRATE, DIFFICULTY);

    expect(expectedSeconds).toBeCloseTo((DIFFICULTY * 2 ** 32) / BITAXE_GAMMA_HASHRATE, 0);
    expect(expectedSeconds / 31_556_952).toBeCloseTo(15_878.6, 0); // 약 1.6만 년
  });

  it("해시레이트나 난이도가 0 이하면 무한대를 반환한다", () => {
    expect(calculateExpectedSecondsToFindBlock(0, DIFFICULTY)).toBe(Number.POSITIVE_INFINITY);
    expect(calculateExpectedSecondsToFindBlock(-1, DIFFICULTY)).toBe(Number.POSITIVE_INFINITY);
    expect(calculateExpectedSecondsToFindBlock(BITAXE_GAMMA_HASHRATE, 0)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("calculateMedianSecondsToFindBlock", () => {
  it("중앙값은 평균의 ln2 배다", () => {
    const expectedSeconds = calculateExpectedSecondsToFindBlock(BITAXE_GAMMA_HASHRATE, DIFFICULTY);
    const medianSeconds = calculateMedianSecondsToFindBlock(BITAXE_GAMMA_HASHRATE, DIFFICULTY);

    expect(medianSeconds / expectedSeconds).toBeCloseTo(0.693, 3);
  });
});

describe("calculateBlockFindProbability", () => {
  it("λ 가 충분히 큰 구간에서는 1 - e^(-λ) 와 일치한다", () => {
    const oneYearInSeconds = 31_556_952;
    const probability = calculateBlockFindProbability(
      BITAXE_GAMMA_HASHRATE,
      DIFFICULTY,
      oneYearInSeconds,
    );

    expect(probability).toBeCloseTo(6.2976e-5, 8);
  });

  it("KH/s 급 채굴기의 블록당 확률에서도 정밀도를 잃지 않는다", () => {
    const tenMinutesInSeconds = 600;
    const probability = calculateBlockFindProbability(
      NERD_MINER_HASHRATE,
      DIFFICULTY,
      tenMinutesInSeconds,
    );

    // 이 구간에서 `1 - Math.exp(-λ)` 는 double 상쇄로 1.11e-16(1 ULP)에 갇혀 43% 오차가 난다.
    const naiveProbability =
      1 - Math.exp(-tenMinutesInSeconds / ((DIFFICULTY * 2 ** 32) / NERD_MINER_HASHRATE));

    expect(probability).toBeCloseTo(7.7832e-17, 20);
    expect(naiveProbability).toBe(1.1102230246251565e-16);
    expect(probability).not.toBe(naiveProbability);
  });

  it("λ 가 더 작아져도 0 으로 무너지지 않는다", () => {
    const probability = calculateBlockFindProbability(1e3, DIFFICULTY, 1);

    expect(probability).toBeGreaterThan(0);
    expect(1 - Math.exp(-1 / ((DIFFICULTY * 2 ** 32) / 1e3))).toBe(0);
  });

  it("유효하지 않은 입력은 0 을 반환한다", () => {
    expect(calculateBlockFindProbability(0, DIFFICULTY, 86_400)).toBe(0);
    expect(calculateBlockFindProbability(BITAXE_GAMMA_HASHRATE, 0, 86_400)).toBe(0);
    expect(calculateBlockFindProbability(BITAXE_GAMMA_HASHRATE, DIFFICULTY, 0)).toBe(0);
    expect(calculateBlockFindProbability(BITAXE_GAMMA_HASHRATE, DIFFICULTY, -1)).toBe(0);
  });
});

describe("calculateNetworkShareRatio", () => {
  it("네트워크 전체 해시레이트 대비 점유율을 구한다", () => {
    const networkHashrate = (DIFFICULTY * 2 ** 32) / 600;
    const shareRatio = calculateNetworkShareRatio(BITAXE_GAMMA_HASHRATE, DIFFICULTY);

    expect(shareRatio).toBeCloseTo(BITAXE_GAMMA_HASHRATE / networkHashrate, 20);
  });

  it("유효하지 않은 입력은 0 을 반환한다", () => {
    expect(calculateNetworkShareRatio(0, DIFFICULTY)).toBe(0);
    expect(calculateNetworkShareRatio(BITAXE_GAMMA_HASHRATE, 0)).toBe(0);
  });
});
