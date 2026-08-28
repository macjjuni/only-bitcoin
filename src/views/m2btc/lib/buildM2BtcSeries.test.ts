import { describe, expect, it } from "vitest";
import { buildM2BtcSeries } from "./buildM2BtcSeries";

describe("buildM2BtcSeries", () => {
  it("BTC 월을 기준으로 같은 달의 M2를 연결한다", () => {
    const bitcoinMonthlyUsdMap = new Map([
      ["2010-08", 0.07],
      ["2010-09", 0.06],
    ]);
    const usM2MonthlyObservations = [
      { monthKey: "2010-08", valueInBillionsUsd: 8800 },
      { monthKey: "2010-09", valueInBillionsUsd: 8820 },
    ];

    expect(buildM2BtcSeries(bitcoinMonthlyUsdMap, usM2MonthlyObservations)).toEqual([
      {
        monthKey: "2010-08",
        bitcoinPriceInUsd: 0.07,
        usM2InBillionsUsd: 8800,
      },
      {
        monthKey: "2010-09",
        bitcoinPriceInUsd: 0.06,
        usM2InBillionsUsd: 8820,
      },
    ]);
  });

  it("입력 순서와 관계없이 BTC 월을 오름차순으로 정렬한다", () => {
    const bitcoinMonthlyUsdMap = new Map([
      ["2010-09", 0.06],
      ["2010-08", 0.07],
    ]);

    const chartPoints = buildM2BtcSeries(bitcoinMonthlyUsdMap, []);

    expect(chartPoints.map(({ monthKey }) => monthKey)).toEqual(["2010-08", "2010-09"]);
  });

  it("M2가 아직 발표되지 않은 최신 BTC 월을 제거하지 않는다", () => {
    const bitcoinMonthlyUsdMap = new Map([
      ["2026-07", 115000],
      ["2026-08", 118000],
    ]);
    const usM2MonthlyObservations = [{ monthKey: "2026-07", valueInBillionsUsd: 23218 }];

    const chartPoints = buildM2BtcSeries(bitcoinMonthlyUsdMap, usM2MonthlyObservations);

    expect(chartPoints).toHaveLength(2);
    expect(chartPoints[1]).toEqual({
      monthKey: "2026-08",
      bitcoinPriceInUsd: 118000,
      usM2InBillionsUsd: null,
    });
  });

  it("BTC에 없는 과거 M2 월은 결과에 포함하지 않는다", () => {
    const bitcoinMonthlyUsdMap = new Map([["2010-08", 0.07]]);
    const usM2MonthlyObservations = [
      { monthKey: "1959-01", valueInBillionsUsd: 286.6 },
      { monthKey: "2010-08", valueInBillionsUsd: 8800 },
    ];

    const chartPoints = buildM2BtcSeries(bitcoinMonthlyUsdMap, usM2MonthlyObservations);

    expect(chartPoints.map(({ monthKey }) => monthKey)).toEqual(["2010-08"]);
  });
});
