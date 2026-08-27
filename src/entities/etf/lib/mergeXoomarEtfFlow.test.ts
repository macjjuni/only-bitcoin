import { describe, expect, it } from "vitest";
import type { XoomarEtfFlowResponse } from "../model/types";
import { mergeXoomarEtfFlowResponses } from "./mergeXoomarEtfFlow";

const ARCHIVED_RESPONSE: XoomarEtfFlowResponse = {
  data: [
    {
      date: "2026-08-25",
      ticker: "IBIT",
      issuer: "BlackRock",
      asset: "btc",
      holdings: "100",
      flowUsd: "10",
      aumUsd: "1000",
    },
    {
      date: "2026-08-24",
      ticker: "IBIT",
      issuer: "BlackRock",
      asset: "btc",
      holdings: "90",
      flowUsd: "5",
      aumUsd: "900",
    },
  ],
  updatedAt: "2026-08-25T23:00:00.000Z",
  source: "xoomar.com",
  docs: "https://xoomar.com/markets/api/etf-flows",
};

describe("mergeXoomarEtfFlowResponses", () => {
  it("최근 응답으로 중복 행을 덮어쓰고 새 날짜를 추가한다", () => {
    const recentResponse: XoomarEtfFlowResponse = {
      ...ARCHIVED_RESPONSE,
      data: [
        { ...ARCHIVED_RESPONSE.data[0], holdings: "110", flowUsd: "20" },
        { ...ARCHIVED_RESPONSE.data[0], date: "2026-08-26", holdings: "120" },
      ],
      updatedAt: "2026-08-26T23:00:00.000Z",
    };

    const mergedResponse = mergeXoomarEtfFlowResponses(ARCHIVED_RESPONSE, recentResponse);

    expect(mergedResponse.data).toHaveLength(3);
    expect(mergedResponse.data[0].date).toBe("2026-08-26");
    expect(mergedResponse.data[1].holdings).toBe("110");
    expect(mergedResponse.updatedAt).toBe("2026-08-26T23:00:00.000Z");
  });
});
