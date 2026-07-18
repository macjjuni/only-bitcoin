import { describe, expect, it } from "vitest";
import type { TradeRecord } from "@/entities/dca";
import { sortTradeRecords } from "./sortTradeRecords";

let seq = 0;
const makeRecord = (overrides: Partial<TradeRecord>): TradeRecord => ({
  id: `test-id-${++seq}`,
  type: "buy",
  btcCount: 0,
  price: 0,
  date: "2026-01-01",
  ...overrides,
});

describe("sortTradeRecords", () => {
  const records = [
    makeRecord({ btcCount: 0.01, date: "2026-02-01" }),
    makeRecord({ type: "sell", btcCount: 0.02, date: "2026-03-01" }),
    makeRecord({ btcCount: 0.005, date: "2026-01-01" }),
  ];

  it("dateDesc: 날짜 내림차순으로 정렬한다", () => {
    const sorted = sortTradeRecords(records, "dateDesc");
    expect(sorted.map((r) => r.date)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });

  it("dateAsc: 날짜 오름차순으로 정렬한다", () => {
    const sorted = sortTradeRecords(records, "dateAsc");
    expect(sorted.map((r) => r.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("dateAsc: 동일 날짜는 입력 순서를 유지한다 (stable)", () => {
    const sameDate = [
      makeRecord({ btcCount: 0.1, date: "2026-01-01" }),
      makeRecord({ btcCount: 0.2, date: "2026-01-01" }),
    ];
    const sorted = sortTradeRecords(sameDate, "dateAsc");
    expect(sorted.map((r) => r.btcCount)).toEqual([0.1, 0.2]);
  });

  it("btcCountDesc: 매도는 음수로 취급해 수량 많은순으로 정렬한다", () => {
    const sorted = sortTradeRecords(records, "btcCountDesc");
    expect(sorted.map((r) => r.btcCount)).toEqual([0.01, 0.005, 0.02]);
  });

  it("btcCountAsc: 매도는 음수로 취급해 수량 적은순으로 정렬한다", () => {
    const sorted = sortTradeRecords(records, "btcCountAsc");
    expect(sorted.map((r) => r.btcCount)).toEqual([0.02, 0.005, 0.01]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...records];
    sortTradeRecords(records, "dateDesc");
    expect(records).toEqual(original);
  });
});
