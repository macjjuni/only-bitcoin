import { describe, expect, it } from "vitest";
import type { TftcEtfFlowResponse } from "../model/types";
import { normalizeTftcEtfFlowResponse } from "./normalizeTftcEtfFlow";

const TEST_RESPONSE: TftcEtfFlowResponse = {
  dateModified: "2026-08-21T22:00:00Z",
  days: [
    {
      date: "2026-08-21",
      netFlowUsd: 150,
      totalNetAssetsUsd: 1000,
      btcCloseUsd: 100,
      perEtfUsd: { ibit: 200, FBTC: -50, BAD: null },
    },
    {
      date: "2026-08-19",
      netFlowUsd: -30,
      totalNetAssetsUsd: null,
      btcCloseUsd: 0,
      perEtfUsd: { IBIT: -30 },
    },
    // 휴장일: 순유입 0, 내역 없음.
    { date: "2026-08-20", netFlowUsd: 0, perEtfUsd: {} },
  ],
};

describe("normalizeTftcEtfFlowResponse", () => {
  it("날짜 오름차순으로 정렬하고 휴장일을 뺀다", () => {
    const snapshot = normalizeTftcEtfFlowResponse(TEST_RESPONSE);

    expect(snapshot.hasFetchFailed).toBe(false);
    expect(snapshot.dailyFlows.map(({ date }) => date)).toEqual(["2026-08-19", "2026-08-21"]);
    expect(snapshot.sourceUpdatedAt).toBe("2026-08-21T22:00:00Z");
  });

  it("티커를 대문자로 맞추고 숫자가 아닌 값과 0 이하 자산·가격은 비운다", () => {
    const [firstFlow, lastFlow] = normalizeTftcEtfFlowResponse(TEST_RESPONSE).dailyFlows;

    expect(lastFlow.fundFlowsInUsd).toEqual({ IBIT: 200, FBTC: -50 });
    expect(lastFlow.totalNetAssetsInUsd).toBe(1000);
    expect(firstFlow.totalNetAssetsInUsd).toBeNull();
    expect(firstFlow.bitcoinCloseInUsd).toBeNull();
  });

  it("ETF별 내역이 없어도 순유입이 0 이 아니면 거래일로 남긴다", () => {
    const snapshot = normalizeTftcEtfFlowResponse({
      days: [{ date: "2026-08-21", netFlowUsd: 12, perEtfUsd: null }],
    });

    expect(snapshot.dailyFlows).toEqual([
      {
        date: "2026-08-21",
        netFlowInUsd: 12,
        totalNetAssetsInUsd: null,
        bitcoinCloseInUsd: null,
        fundFlowsInUsd: {},
      },
    ]);
  });

  it("형식이 깨진 행은 버리고, 쓸 행이 없으면 실패로 본다", () => {
    const snapshot = normalizeTftcEtfFlowResponse({
      days: [
        { date: "21/08/2026", netFlowUsd: 10 },
        { date: "2026-08-21", netFlowUsd: null },
      ],
    });

    expect(snapshot.hasFetchFailed).toBe(true);
    expect(normalizeTftcEtfFlowResponse({} as TftcEtfFlowResponse).hasFetchFailed).toBe(true);
  });
});
