import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSpaceMarketSample } from "./spaceMarketFeed";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("공간 시세 조회", () => {
  it("현재 30분봉의 시가와 최신 가격을 사용한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T00:12:00Z"));
    const open = Date.parse("2026-11-11T00:00:00Z");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify([[open, "100000", "102000", "99000", "101000"]])),
        ),
    );
    expect(await fetchSpaceMarketSample()).toEqual({
      referencePrice: 100000,
      price: 101000,
      atMs: Date.now(),
    });
  });

  it("지난 봉만 오면 오래된 가격으로 발동하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify([[0, "100", "102", "99", "101"]]))),
    );
    await expect(fetchSpaceMarketSample()).rejects.toThrow("unavailable");
  });

  it("429 응답은 Retry-After를 적용한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "120" } })),
    );
    await expect(fetchSpaceMarketSample()).rejects.toMatchObject({ retryAfterMs: 120000 });
  });
});
