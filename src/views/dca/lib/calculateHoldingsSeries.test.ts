import { describe, expect, it } from "vitest";
import type { TradeRecord } from "@/entities/dca";
import { calculateHoldingsSeries } from "./calculateHoldingsSeries";
import { getTodayString } from "./format";

let seq = 0;
const makeRecord = (overrides: Partial<TradeRecord>): TradeRecord => ({
  id: `test-id-${++seq}`,
  type: "buy",
  btcCount: 0,
  price: 0,
  date: "2026-01-01",
  ...overrides,
});

const DAY_MS = 86_400_000;
const dateToTimestamp = (date: string): number => new Date(`${date}T00:00:00`).getTime();

describe("calculateHoldingsSeries", () => {
  it("기록이 없으면 빈 배열을 반환한다", () => {
    expect(calculateHoldingsSeries([])).toEqual([]);
  });

  it("첫 기록 전날 보유량 0 기준점을 추가한다", () => {
    const today = getTodayString();
    const points = calculateHoldingsSeries([makeRecord({ btcCount: 0.1, date: today })]);

    expect(points[0]).toEqual({ x: dateToTimestamp(today) - DAY_MS, y: 0 });
    expect(points[1]).toEqual({ x: dateToTimestamp(today), y: 0.1 });
  });

  it("날짜 오름차순으로 누적 보유량을 계산한다", () => {
    const today = getTodayString();
    const records = [
      makeRecord({ type: "sell", btcCount: 0.1, date: today }),
      makeRecord({ btcCount: 0.2, date: "2026-01-01" }),
    ];
    const points = calculateHoldingsSeries(records);

    expect(points.map((p) => p.y)).toEqual([0, 0.2, 0.1]);
  });

  it("동일 날짜의 기록은 하나의 포인트로 합산한다", () => {
    const today = getTodayString();
    const records = [
      makeRecord({ btcCount: 0.1, date: today }),
      makeRecord({ btcCount: 0.2, date: today }),
    ];
    const points = calculateHoldingsSeries(records);

    expect(points).toHaveLength(2); // 기준점 + 오늘 포인트
    expect(points[1].y).toBeCloseTo(0.3, 8);
  });

  it("마지막 기록이 오늘 이전이면 오늘 날짜 포인트를 추가한다", () => {
    const points = calculateHoldingsSeries([makeRecord({ btcCount: 0.1, date: "2026-01-01" })]);
    const lastPoint = points[points.length - 1];

    expect(lastPoint.x).toBe(dateToTimestamp(getTodayString()));
    expect(lastPoint.y).toBe(0.1);
  });
});
