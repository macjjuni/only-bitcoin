import { describe, expect, it } from "vitest";
import type { TradeRecord } from "@/entities/dca";
import { applyTradeSats, btcToSats, satsToBtc } from "./satoshi";

const makeRecord = (overrides: Partial<TradeRecord>): TradeRecord => ({
  id: "test-id",
  type: "buy",
  btcCount: 0,
  price: 0,
  date: "2026-01-01",
  ...overrides,
});

describe("btcToSats", () => {
  it("BTC 개수를 사토시 정수로 변환한다", () => {
    expect(btcToSats(1)).toBe(100_000_000);
    expect(btcToSats(0.00000001)).toBe(1);
    expect(btcToSats(0)).toBe(0);
  });

  it("부동소수점 오차가 있는 값도 정수로 반올림한다", () => {
    // 0.1 + 0.2 = 0.30000000000000004
    expect(btcToSats(0.1 + 0.2)).toBe(30_000_000);
  });
});

describe("satsToBtc", () => {
  it("사토시를 BTC 개수로 변환한다", () => {
    expect(satsToBtc(100_000_000)).toBe(1);
    expect(satsToBtc(1)).toBe(0.00000001);
    expect(satsToBtc(0)).toBe(0);
  });
});

describe("applyTradeSats", () => {
  it("매수는 보유 사토시에 가산한다", () => {
    const record = makeRecord({ type: "buy", btcCount: 0.5 });
    expect(applyTradeSats(100_000_000, record)).toBe(150_000_000);
  });

  it("매도는 보유 사토시에서 차감한다", () => {
    const record = makeRecord({ type: "sell", btcCount: 0.3 });
    expect(applyTradeSats(100_000_000, record)).toBe(70_000_000);
  });

  it("보유량을 초과하는 매도는 보유분까지만 차감한다", () => {
    const record = makeRecord({ type: "sell", btcCount: 2 });
    expect(applyTradeSats(100_000_000, record)).toBe(0);
  });
});
