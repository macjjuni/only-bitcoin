import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBinanceWithdrawInfo } from "./binanceWithdraw.server";

vi.mock("next/cache", () => ({
  unstable_cache: (callback: (...argumentsList: never[]) => unknown) => callback,
}));

const makeNetwork = (
  network: string,
  withdrawFee: string,
  withdrawMin: string,
  overrides: Partial<{ withdrawEnable: boolean; busy: boolean }> = {},
) => ({
  network,
  withdrawFee,
  withdrawMin,
  withdrawEnable: overrides.withdrawEnable ?? true,
  busy: overrides.busy ?? false,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBinanceWithdrawInfo", () => {
  it("국내 거래소와 비교 가능한 네트워크만 반환한다", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: "000000",
          success: true,
          data: [
            {
              coin: "BTC",
              networkList: [
                makeNetwork("BTC", "0.00002", "0.0001"),
                makeNetwork("BSC", "0.00000027", "0.00000054"),
                makeNetwork("LIGHTNING", "0.000001", "0.00002"),
              ],
            },
            {
              coin: "USDT",
              networkList: [
                makeNetwork("TRX", "1.5", "5"),
                makeNetwork("ETH", "0.3", "5"),
                makeNetwork("KAIA", "0.02", "5"),
                makeNetwork("APT", "0.1", "5", { busy: true }),
                makeNetwork("SOL", "0.3", "5"),
                makeNetwork("ARBITRUM", "0.1", "3"),
              ],
            },
          ],
        }),
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBinanceWithdrawInfo();

    expect(Object.keys(result.options).sort()).toEqual(
      [
        "BTC:Bitcoin",
        "BTC:Lightning",
        "USDT:Aptos",
        "USDT:Ethereum",
        "USDT:Kaia",
        "USDT:Tron",
      ].sort(),
    );
    expect(result.options["BTC:Lightning"]?.withdrawFee).toBe(0.000001);
    expect(result.options["BTC:Lightning"]?.minimumWithdraw).toBe(0.00002);
    expect(result.options["USDT:Aptos"]?.isWithdrawAvailable).toBe(false);
    expect(result.options["USDT:Tron"]?.minimumWithdraw).toBe(5);
    expect(result.meta.source).toBe("live");
  });
});
