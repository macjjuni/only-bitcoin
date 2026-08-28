import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: <Result>(callback: () => Promise<Result>) => callback,
}));

import { getUsM2MonthlyObservations } from "./fredM2.server";

const originalFredApiKey = process.env.FRED_API_KEY;

describe("getUsM2MonthlyObservations", () => {
  beforeEach(() => {
    delete process.env.FRED_API_KEY;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (originalFredApiKey === undefined) {
      delete process.env.FRED_API_KEY;

      return;
    }

    process.env.FRED_API_KEY = originalFredApiKey;
  });

  it("FRED API 키가 없어도 빈 배열로 대체해 빌드를 중단하지 않는다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(getUsM2MonthlyObservations()).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[fred] FRED_API_KEY가 없어 미국 M2 데이터를 표시하지 않습니다.",
    );
  });
});
