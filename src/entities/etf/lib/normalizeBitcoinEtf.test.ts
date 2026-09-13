import { describe, expect, it } from "vitest";
import type { XoomarEtfFlowResponse } from "../model/types";
import { isEstimatedFlowOutlier, normalizeBitcoinEtfResponse } from "./normalizeBitcoinEtf";

const TEST_RESPONSE: XoomarEtfFlowResponse = {
  data: [
    {
      date: "2026-08-22",
      ticker: "AAA",
      issuer: "Alpha",
      asset: "btc",
      holdings: "12",
      flowUsd: "100",
      aumUsd: "1000",
    },
    {
      date: "2026-08-21",
      ticker: "AAA",
      issuer: "Alpha",
      asset: "btc",
      holdings: "10",
      flowUsd: "100",
      aumUsd: "1000",
    },
    {
      date: "2026-08-21",
      ticker: "BBB",
      issuer: "Beta",
      asset: "btc",
      holdings: "20",
      flowUsd: "900",
      aumUsd: "1000",
    },
  ],
  updatedAt: "2026-08-23T00:00:00.000Z",
  source: "xoomar.com",
  docs: "https://xoomar.com/markets/api/etf-flows",
};

describe("isEstimatedFlowOutlier", () => {
  it("일일 추정 흐름이 AUM의 절반 이상이면 이상치로 분류한다", () => {
    expect(isEstimatedFlowOutlier(500, 1000)).toBe(true);
    expect(isEstimatedFlowOutlier(-700, 1000)).toBe(true);
    expect(isEstimatedFlowOutlier(499, 1000)).toBe(false);
  });

  it("흐름 값이 없으면 이상치로 분류하지 않는다", () => {
    expect(isEstimatedFlowOutlier(null, 1000)).toBe(false);
  });

  it("AUM이 없어도 보고된 흐름 값은 이상치로 분류하지 않는다", () => {
    expect(isEstimatedFlowOutlier(100, null)).toBe(false);
    expect(isEstimatedFlowOutlier(-100, null)).toBe(false);
  });
});

describe("normalizeBitcoinEtfResponse", () => {
  it("전체 종목이 존재하는 최근 날짜를 기준일로 선택한다", () => {
    const snapshot = normalizeBitcoinEtfResponse(TEST_RESPONSE);

    expect(snapshot.summary.referenceDate).toBe("2026-08-21");
    expect(snapshot.summary.latestSourceDate).toBe("2026-08-22");
    expect(snapshot.summary.trackedFundCount).toBe(2);
    expect(snapshot.summary.isFullCoverage).toBe(true);
  });

  it("이상 흐름을 합계에서 제외하되 원본 ETF 행은 유지한다", () => {
    const snapshot = normalizeBitcoinEtfResponse(TEST_RESPONSE);

    expect(snapshot.summary.estimatedNetFlowInUsd).toBe(100);
    expect(snapshot.summary.validFlowFundCount).toBe(1);
    expect(snapshot.summary.excludedFlowCount).toBe(1);
    expect(snapshot.funds).toHaveLength(2);
    expect(snapshot.funds.find(({ ticker }) => ticker === "BBB")?.isEstimatedFlowExcluded).toBe(
      true,
    );
  });

  it("일부 ETF의 흐름만 보고된 최신 날짜는 현재까지의 합계로 표시한다", () => {
    const partialResponse: XoomarEtfFlowResponse = {
      ...TEST_RESPONSE,
      data: [
        ...TEST_RESPONSE.data,
        {
          date: "2026-08-22",
          ticker: "BBB",
          issuer: "Beta",
          asset: "btc",
          holdings: null,
          flowUsd: null,
          aumUsd: null,
        },
      ],
    };

    const snapshot = normalizeBitcoinEtfResponse(partialResponse);

    expect(snapshot.summary.referenceDate).toBe("2026-08-22");
    expect(snapshot.summary.estimatedNetFlowInUsd).toBe(100);
    expect(snapshot.summary.reportedFundCount).toBe(1);
    expect(snapshot.summary.validFlowFundCount).toBe(1);
    expect(snapshot.summary.isFullCoverage).toBe(false);
    expect(snapshot.dailyFlows.at(-1)?.date).toBe("2026-08-21");
  });
});
