import { afterEach, describe, expect, it, vi } from "vitest";
import { createAssetRankingHtml } from "../lib/__fixtures__/assetRanking";
import { collectAssetRanking } from "./collectAssetRanking.server";

const createHtmlResponse = () =>
  new Response(createAssetRankingHtml(), {
    headers: { "content-type": "text/html; charset=UTF-8" },
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("collectAssetRanking", () => {
  it("검증 완료한 결과에만 수집 시각을 붙인다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createHtmlResponse());
    vi.stubGlobal("fetch", fetchMock);
    const snapshot = await collectAssetRanking();
    expect(snapshot.assets).toHaveLength(100);
    expect(Number.isFinite(Date.parse(snapshot.fetchedAt))).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("403은 즉시 중단하며 실패 스냅샷을 반환하지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(collectAssetRanking()).rejects.toThrow("HTTP 403");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("8초를 넘기는 정상 응답도 중단하거나 재시도하지 않고 수집한다", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((delayInMilliseconds) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new DOMException("Request timed out", "TimeoutError"));
      }, delayInMilliseconds);
      return controller.signal;
    });
    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const responseTimer = setTimeout(() => resolve(createHtmlResponse()), 9000);
          options.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(responseTimer);
              reject(options.signal?.reason);
            },
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([
      expect(collectAssetRanking()).resolves.toHaveProperty("assets.length", 100),
      vi.runAllTimersAsync(),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503, "network", "timeout"])("일시 장애 %s는 한 번 재시도한다", async (failure) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    if (typeof failure === "number") {
      fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status: failure }));
    } else {
      fetchMock.mockRejectedValueOnce(new Error(failure));
    }
    fetchMock.mockResolvedValueOnce(createHtmlResponse());
    vi.stubGlobal("fetch", fetchMock);
    const assertion = expect(collectAssetRanking()).resolves.toHaveProperty("assets.length", 100);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("재시도를 소진해도 실패를 정상 결과로 바꾸지 않는다", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network down"));
    vi.stubGlobal("fetch", fetchMock);
    const assertion = expect(collectAssetRanking()).rejects.toThrow("Network down");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("HTTP 200 차단 HTML과 JSON 응답을 거부한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Access denied", { headers: { "content-type": "text/html" } }),
      )
      .mockResolvedValueOnce(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(collectAssetRanking()).rejects.toThrow("행 개수");
    await expect(collectAssetRanking()).rejects.toThrow("HTML이 아닙니다");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
