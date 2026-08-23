import { describe, expect, it } from "vitest";
import {
  calculateFilledSegmentCount,
  calculateSegmentFillRatio,
  calculateSupplySharePercent,
  TOTAL_BITCOIN_SUPPLY_IN_BTC,
} from "./supplyGauge";

describe("calculateSupplySharePercent", () => {
  it("총 발행량을 분모로 비중을 계산한다", () => {
    expect(calculateSupplySharePercent(1_282_517)).toBeCloseTo(
      (1_282_517 / TOTAL_BITCOIN_SUPPLY_IN_BTC) * 100,
      6,
    );
  });

  it("보유량이 없으면 0 을 반환한다", () => {
    expect(calculateSupplySharePercent(0)).toBe(0);
    expect(calculateSupplySharePercent(Number.NaN)).toBe(0);
  });
});

describe("calculateFilledSegmentCount", () => {
  it("한 칸이 100만 BTC 이므로 비중 10% 는 2.1칸이다", () => {
    expect(calculateFilledSegmentCount(10)).toBeCloseTo(2.1, 6);
  });
});

describe("calculateSegmentFillRatio", () => {
  it("지나간 칸은 가득, 다음 칸은 남은 소수만큼만 채운다", () => {
    expect(calculateSegmentFillRatio(0, 1.28)).toBe(1);
    expect(calculateSegmentFillRatio(1, 1.28)).toBeCloseTo(0.28, 6);
    expect(calculateSegmentFillRatio(2, 1.28)).toBe(0);
  });
});
