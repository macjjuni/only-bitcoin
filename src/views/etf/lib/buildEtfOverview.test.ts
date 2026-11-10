import { describe, expect, it } from "vitest";
import type { BitcoinEtfDailyFlow } from "@/entities/etf";
import { buildEtfOverview } from "./buildEtfOverview";

const createDailyFlow = (
  date: string,
  fundFlowsInUsd: Record<string, number>,
  overrides: Partial<BitcoinEtfDailyFlow> = {},
): BitcoinEtfDailyFlow => ({
  date,
  netFlowInUsd: Object.values(fundFlowsInUsd).reduce((sum, flowInUsd) => sum + flowInUsd, 0),
  totalNetAssetsInUsd: null,
  bitcoinCloseInUsd: null,
  fundFlowsInUsd,
  ...overrides,
});

const DAILY_FLOWS: BitcoinEtfDailyFlow[] = [
  createDailyFlow("2026-08-17", { IBIT: 500, GBTC: -100 }),
  createDailyFlow("2026-08-18", { IBIT: -300, GBTC: -50 }),
  createDailyFlow(
    "2026-08-19",
    { IBIT: -20, GBTC: 0 },
    { totalNetAssetsInUsd: 1000, bitcoinCloseInUsd: 50 },
  ),
  createDailyFlow("2026-08-20", { IBIT: -10, GBTC: -5, FBTC: 3 }, { bitcoinCloseInUsd: 60 }),
];

describe("buildEtfOverview", () => {
  it("거래일이 없으면 null", () => {
    expect(buildEtfOverview([])).toBeNull();
  });

  it("최근 거래일과 기간 합계를 뽑는다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.firstDate).toBe("2026-08-17");
    expect(overview?.latestDate).toBe("2026-08-20");
    expect(overview?.latestNetFlowInUsd).toBe(-12);
    expect(overview?.cumulativeNetFlowInUsd).toBe(18);
    expect(overview?.sevenDayNetFlowInUsd).toBe(18);
    expect(overview?.tradingDayCount).toBe(4);
  });

  it("최근 거래일의 유입·유출 ETF 수를 센다. 0 은 어느 쪽도 아니다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.latestFundCount).toBe(3);
    expect(overview?.latestInflowFundCount).toBe(1);
    expect(overview?.latestOutflowFundCount).toBe(2);
  });

  it("최근 거래일과 같은 방향이 이어진 날을 센다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.streakDirection).toBe("outflow");
    expect(overview?.streakDayCount).toBe(3);
  });

  it("최대 유입일과 최대 유출일을 찾는다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.largestInflow).toEqual({ date: "2026-08-17", netFlowInUsd: 400 });
    expect(overview?.largestOutflow).toEqual({ date: "2026-08-18", netFlowInUsd: -350 });
  });

  it("운용자산은 값이 있는 가장 최근 날 것을 쓰고, 보유량은 같은 날 가격으로 환산한다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.totalNetAssetsInUsd).toBe(1000);
    expect(overview?.estimatedHoldingsInBtc).toBe(20);
  });

  it("ETF별 합계를 누적 순유입이 큰 순서로 정리한다. 내역에 없는 날은 0 으로 본다", () => {
    const overview = buildEtfOverview(DAILY_FLOWS);

    expect(overview?.fundFlows).toEqual([
      {
        ticker: "IBIT",
        latestInUsd: -10,
        sevenDayInUsd: 170,
        thirtyDayInUsd: 170,
        cumulativeInUsd: 170,
      },
      { ticker: "FBTC", latestInUsd: 3, sevenDayInUsd: 3, thirtyDayInUsd: 3, cumulativeInUsd: 3 },
      {
        ticker: "GBTC",
        latestInUsd: -5,
        sevenDayInUsd: -155,
        thirtyDayInUsd: -155,
        cumulativeInUsd: -155,
      },
    ]);
  });

  it("보합으로 끝나면 연속 일수는 0", () => {
    const overview = buildEtfOverview([...DAILY_FLOWS, createDailyFlow("2026-08-21", { IBIT: 0 })]);

    expect(overview?.streakDirection).toBe("flat");
    expect(overview?.streakDayCount).toBe(0);
  });
});
