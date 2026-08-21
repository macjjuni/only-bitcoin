import { describe, expect, it } from "vitest";
import { buildMonthlyReturnGrid } from "./buildMonthlyReturnGrid";

/** `{ '2023-01': 100, ... }` 를 Map 으로 바꿔 줌. */
function makeCloseMap(entries: Record<string, number>) {
  return new Map(Object.entries(entries));
}

/** 한 해를 매달 같은 값으로 채움. */
function makeFlatYear(year: number, close: number, throughMonth = 12) {
  const entries: Record<string, number> = {};

  for (let month = 1; month <= throughMonth; month += 1) {
    entries[`${year}-${String(month).padStart(2, "0")}`] = close;
  }

  return entries;
}

describe("buildMonthlyReturnGrid", () => {
  it("빈 Map 은 빈 격자다", () => {
    expect(buildMonthlyReturnGrid(new Map())).toEqual([]);
  });

  it("연도별 행을 오름차순으로 만든다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ ...makeFlatYear(2022, 100), ...makeFlatYear(2023, 100) }),
    );

    expect(grid.map((row) => row.year)).toEqual([2022, 2023]);
    expect(grid[0].monthlyReturnRates).toHaveLength(12);
  });

  it("전월 종가 대비로 계산한다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ "2023-01": 100, "2023-02": 150, "2023-03": 75 }),
    );

    expect(grid[0].monthlyReturnRates[1]).toBeCloseTo(50);
    expect(grid[0].monthlyReturnRates[2]).toBeCloseTo(-50);
  });

  /**
   * 이 테스트가 잡는 버그:
   * 1월의 분모를 같은 해에서 찾으면 매년 1월 칸이 통째로 비어 버림.
   */
  it("1월은 전년 12월 종가를 분모로 쓴다", () => {
    const grid = buildMonthlyReturnGrid(makeCloseMap({ "2022-12": 200, "2023-01": 300 }));

    const year2023 = grid.find((row) => row.year === 2023);

    expect(year2023?.monthlyReturnRates[0]).toBeCloseTo(50);
  });

  it("전년 12월이 없는 첫 해의 1월은 비워 둔다", () => {
    const grid = buildMonthlyReturnGrid(makeCloseMap({ "2010-08": 0.07, "2010-09": 0.14 }));

    expect(grid[0].year).toBe(2010);
    expect(grid[0].monthlyReturnRates[0]).toBeNull();
    expect(grid[0].monthlyReturnRates[8]).toBeCloseTo(100);
  });

  it("가운데 달이 비면 그 달과 다음 달이 모두 비어야 한다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ "2023-04": 100, "2023-06": 200, "2023-07": 400 }),
    );

    const [row] = grid;

    expect(row.monthlyReturnRates[4]).toBeNull();
    expect(row.monthlyReturnRates[5]).toBeNull();
    expect(row.monthlyReturnRates[6]).toBeCloseTo(100);
  });

  it("연간 열은 전년 12월 대비 그 해 마지막 종가다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ "2022-12": 100, ...makeFlatYear(2023, 100, 11), "2023-12": 250 }),
    );

    expect(grid.find((row) => row.year === 2023)?.annualReturnRate).toBeCloseTo(150);
  });

  it("진행 중인 해의 연간 열은 마지막으로 존재하는 달까지만 반영한다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ "2025-12": 100, ...makeFlatYear(2026, 100, 7), "2026-08": 180 }),
    );

    const year2026 = grid.find((row) => row.year === 2026);

    expect(year2026?.annualReturnRate).toBeCloseTo(80);
    expect(year2026?.monthlyReturnRates[8]).toBeNull();
  });

  it("첫 해의 연간 열은 분모가 없어 비어 있다", () => {
    const grid = buildMonthlyReturnGrid(makeCloseMap(makeFlatYear(2010, 1)));

    expect(grid[0].annualReturnRate).toBeNull();
  });

  /** 소스가 초기 구간을 0 으로 내려주는 일이 실제로 있음. */
  it("분모가 0 이어도 Infinity 를 내지 않는다", () => {
    const grid = buildMonthlyReturnGrid(makeCloseMap({ "2010-08": 0, "2010-09": 0.14 }));

    expect(grid[0].monthlyReturnRates[8]).toBeNull();
  });

  it("중간에 통째로 빈 해가 있어도 연도 축이 끊기지 않는다", () => {
    const grid = buildMonthlyReturnGrid(
      makeCloseMap({ ...makeFlatYear(2021, 100), ...makeFlatYear(2023, 100) }),
    );

    expect(grid.map((row) => row.year)).toEqual([2021, 2022, 2023]);
    expect(grid[1].monthlyReturnRates.every((rate) => rate === null)).toBe(true);
  });
});
