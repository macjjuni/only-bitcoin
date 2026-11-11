import { describe, expect, it, vi } from "vitest";
import { fetchCoinMarketSnapshot } from "@/entities/coin-market/server";
import { GET } from "./route";

vi.mock("@/entities/coin-market/server", () => ({ fetchCoinMarketSnapshot: vi.fn() }));

describe("GET /api/coin-market", () => {
  it.each([
    false,
    true,
  ])("조회 실패(%s)에 맞춰 HTTP 상태와 캐시를 구분한다", async (hasFetchFailed) => {
    const snapshot = {
      coins: [],
      totalMarketCapInUsd: 0,
      othersMarketCapInUsd: 0,
      bitcoinDominancePercent: 0,
      fetchedAt: "2026-11-11T00:00:00Z",
      hasFetchFailed,
    };
    vi.mocked(fetchCoinMarketSnapshot).mockResolvedValueOnce(snapshot);
    const response = await GET();
    expect(response.status).toBe(hasFetchFailed ? 503 : 200);
    expect(response.headers.get("Cache-Control")).toBe(
      hasFetchFailed ? "no-store" : "public, max-age=0, s-maxage=300",
    );
    expect(await response.json()).toEqual(snapshot);
  });
});
