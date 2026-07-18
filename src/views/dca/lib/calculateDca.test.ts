import { describe, expect, it } from "vitest";
import type { TradeRecord } from "@/entities/dca";
import { calculateDcaSummary, calculateHoldingBtcCount } from "./calculateDca";

let seq = 0;
const makeRecord = (overrides: Partial<TradeRecord>): TradeRecord => ({
  id: `test-id-${++seq}`,
  type: "buy",
  btcCount: 0,
  price: 0,
  date: "2026-01-01",
  ...overrides,
});

describe("calculateDcaSummary", () => {
  it("기록이 없으면 모든 지표가 0이다", () => {
    const summary = calculateDcaSummary([], 1, 150_000_000);

    expect(summary.totalBtcCount).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.avgPrice).toBe(0);
    expect(summary.valuation).toBe(0);
    expect(summary.profit).toBe(0);
    expect(summary.profitRate).toBe(0);
    expect(summary.achievementRate).toBe(0);
    expect(summary.remainingBtcCount).toBe(1);
  });

  it("매수만 있을 때 평단가와 평가손익을 계산한다", () => {
    const records = [
      makeRecord({ btcCount: 0.1, price: 100_000_000, date: "2026-01-01" }),
      makeRecord({ btcCount: 0.1, price: 200_000_000, date: "2026-02-01" }),
    ];
    const summary = calculateDcaSummary(records, 1, 200_000_000);

    expect(summary.totalBtcCount).toBeCloseTo(0.2, 8);
    expect(summary.totalCost).toBe(30_000_000);
    expect(summary.avgPrice).toBe(150_000_000);
    expect(summary.valuation).toBe(40_000_000);
    expect(summary.profit).toBe(10_000_000);
    expect(summary.profitRate).toBeCloseTo(33.3333, 3);
    expect(summary.achievementRate).toBeCloseTo(20, 8);
    expect(summary.remainingBtcCount).toBeCloseTo(0.8, 8);
  });

  it("매도 시 평단가는 유지하고 원가를 비례 차감한다 (이동평균법)", () => {
    const records = [
      makeRecord({ btcCount: 0.2, price: 100_000_000, date: "2026-01-01" }),
      makeRecord({ type: "sell", btcCount: 0.1, price: 300_000_000, date: "2026-02-01" }),
    ];
    const summary = calculateDcaSummary(records, 1, 200_000_000);

    expect(summary.totalBtcCount).toBeCloseTo(0.1, 8);
    expect(summary.totalCost).toBe(10_000_000); // 20M 원가에서 절반 차감
    expect(summary.avgPrice).toBe(100_000_000); // 평단가 유지
  });

  it("기록 날짜가 뒤섞여 있어도 날짜순으로 계산한다", () => {
    const shuffled = [
      makeRecord({ type: "sell", btcCount: 0.1, price: 200_000_000, date: "2026-02-01" }),
      makeRecord({ btcCount: 0.1, price: 100_000_000, date: "2026-01-01" }),
    ];
    const summary = calculateDcaSummary(shuffled, 1, 200_000_000);

    // 매수(1월) → 매도(2월) 순서로 계산되어 보유 0
    expect(summary.totalBtcCount).toBe(0);
    expect(summary.totalCost).toBe(0);
  });

  it("보유량을 초과하는 매도는 보유분까지만 반영한다", () => {
    const records = [
      makeRecord({ btcCount: 0.1, price: 100_000_000, date: "2026-01-01" }),
      makeRecord({ type: "sell", btcCount: 1, price: 200_000_000, date: "2026-02-01" }),
      makeRecord({ btcCount: 0.1, price: 100_000_000, date: "2026-03-01" }),
    ];
    const summary = calculateDcaSummary(records, 1, 100_000_000);

    expect(summary.totalBtcCount).toBeCloseTo(0.1, 8);
    expect(summary.totalCost).toBe(10_000_000);
  });

  it("목표 달성률은 100%를 넘지 않는다", () => {
    const records = [makeRecord({ btcCount: 2, price: 100_000_000 })];
    const summary = calculateDcaSummary(records, 1, 100_000_000);

    expect(summary.achievementRate).toBe(100);
    expect(summary.remainingBtcCount).toBe(0);
  });

  it("현재가가 0이면 평가 지표는 0으로 반환한다", () => {
    const records = [makeRecord({ btcCount: 0.1, price: 100_000_000 })];
    const summary = calculateDcaSummary(records, 1, 0);

    expect(summary.valuation).toBe(0);
    expect(summary.profit).toBe(0);
    expect(summary.profitRate).toBe(0);
  });
});

describe("calculateHoldingBtcCount", () => {
  it("매수 합계에서 매도 합계를 뺀 보유 개수를 반환한다", () => {
    const records = [
      makeRecord({ btcCount: 0.3, date: "2026-01-01" }),
      makeRecord({ type: "sell", btcCount: 0.1, date: "2026-02-01" }),
    ];
    expect(calculateHoldingBtcCount(records)).toBeCloseTo(0.2, 8);
  });

  it("excludeId로 지정한 기록은 계산에서 제외한다", () => {
    const buyRecord = makeRecord({ btcCount: 0.3, date: "2026-01-01" });
    const sellRecord = makeRecord({ type: "sell", btcCount: 0.1, date: "2026-02-01" });

    expect(calculateHoldingBtcCount([buyRecord, sellRecord], sellRecord.id)).toBeCloseTo(0.3, 8);
  });

  it("중간 시점 과매도가 있어도 요약과 동일한 기준(기록별 클램프)으로 계산한다", () => {
    // 매수 1 → 매도 2(과매도) → 매수 1 : 기록별 클램프 기준 보유 1
    const records = [
      makeRecord({ btcCount: 1, date: "2026-01-01" }),
      makeRecord({ type: "sell", btcCount: 2, date: "2026-02-01" }),
      makeRecord({ btcCount: 1, date: "2026-03-01" }),
    ];

    const holding = calculateHoldingBtcCount(records);
    const summary = calculateDcaSummary(records, 1, 100_000_000);

    expect(holding).toBe(1);
    expect(holding).toBe(summary.totalBtcCount);
  });
});
