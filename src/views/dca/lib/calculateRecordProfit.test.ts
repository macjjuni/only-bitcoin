import { describe, expect, it } from "vitest";
import type { TradeRecord } from "@/entities/dca";
import { calculateRecordProfit, calculateTradeAmount } from "./calculateRecordProfit";

let seq = 0;
const makeRecord = (overrides: Partial<TradeRecord>): TradeRecord => ({
  id: `test-id-${++seq}`,
  type: "buy",
  btcCount: 0,
  price: 0,
  date: "2026-01-01",
  ...overrides,
});

describe("calculateTradeAmount", () => {
  it("수량 × 단가를 원 단위로 반올림한다", () => {
    expect(calculateTradeAmount(0.5, 100_000_000)).toBe(50_000_000);
  });

  it("소수 8자리 수량에서도 부동소수점 오차 없이 계산한다", () => {
    expect(calculateTradeAmount(0.00000001, 100_000_000)).toBe(1);
  });
});

describe("calculateRecordProfit", () => {
  it("현재가가 매수단가보다 높으면 이익을 반환한다", () => {
    const record = makeRecord({ btcCount: 0.1, price: 100_000_000 });
    const result = calculateRecordProfit(record, 120_000_000);

    expect(result).toEqual({ profit: 2_000_000, profitRate: 20 });
  });

  it("현재가가 매수단가보다 낮으면 손실을 반환한다", () => {
    const record = makeRecord({ btcCount: 0.1, price: 100_000_000 });
    const result = calculateRecordProfit(record, 90_000_000);

    expect(result).toEqual({ profit: -1_000_000, profitRate: -10 });
  });

  it("현재가와 매수단가가 같으면 손익 0을 반환한다", () => {
    const record = makeRecord({ btcCount: 0.1, price: 100_000_000 });
    const result = calculateRecordProfit(record, 100_000_000);

    expect(result).toEqual({ profit: 0, profitRate: 0 });
  });

  it("매도 기록은 계산하지 않고 null을 반환한다", () => {
    const record = makeRecord({ type: "sell", btcCount: 0.1, price: 100_000_000 });

    expect(calculateRecordProfit(record, 120_000_000)).toBeNull();
  });

  it("시세를 아직 못 받았으면(0) null을 반환한다", () => {
    const record = makeRecord({ btcCount: 0.1, price: 100_000_000 });

    expect(calculateRecordProfit(record, 0)).toBeNull();
  });

  it("단가나 수량이 0인 기록은 null을 반환한다", () => {
    expect(calculateRecordProfit(makeRecord({ btcCount: 0.1, price: 0 }), 120_000_000)).toBeNull();
    expect(
      calculateRecordProfit(makeRecord({ btcCount: 0, price: 100_000_000 }), 120_000_000),
    ).toBeNull();
  });
});
