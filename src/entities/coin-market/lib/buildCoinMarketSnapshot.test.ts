import { describe, expect, it } from "vitest";
import type { CoinGeckoMarketResponseItem } from "../model/types";
import { buildCoinMarketSnapshot } from "./buildCoinMarketSnapshot";

const createMarket = (
  id: string,
  marketCap: number | null,
  overrides: Partial<CoinGeckoMarketResponseItem> = {},
): CoinGeckoMarketResponseItem => ({
  id,
  symbol: id.slice(0, 3),
  name: id,
  current_price: 1,
  market_cap: marketCap,
  market_cap_rank: null,
  price_change_percentage_24h: 1.5,
  ...overrides,
});

const baseParams = {
  totalMarketCapInUsd: 1000,
  bitcoinDominancePercent: 59.5,
  stablecoinIds: new Set(["tether"]),
  fetchedAt: "2026-11-10T00:00:00.000Z",
};

describe("buildCoinMarketSnapshot", () => {
  it("시총순으로 정렬하고 순위·기타·스테이블 여부를 채운다", () => {
    const snapshot = buildCoinMarketSnapshot({
      ...baseParams,
      markets: [createMarket("tether", 100), createMarket("bitcoin", 600)],
    });
    expect(snapshot?.coins.map((coin) => [coin.id, coin.rank, coin.isStablecoin])).toEqual([
      ["bitcoin", 1, false],
      ["tether", 2, true],
    ]);
    expect(snapshot?.coins[0].symbol).toBe("BIT");
    expect(snapshot?.othersMarketCapInUsd).toBe(300);
  });

  it("시총 없는 항목은 버리고 등락률 null 은 그대로 둔다", () => {
    const snapshot = buildCoinMarketSnapshot({
      ...baseParams,
      markets: [
        createMarket("bitcoin", 600, { price_change_percentage_24h: null }),
        createMarket("broken", null),
      ],
    });
    expect(snapshot?.coins).toHaveLength(1);
    expect(snapshot?.coins[0].dailyChangePercent).toBeNull();
  });

  it("상위 합계가 전체보다 크면 기타는 0, 전체는 합계로 맞춘다", () => {
    const snapshot = buildCoinMarketSnapshot({
      ...baseParams,
      totalMarketCapInUsd: 500,
      markets: [createMarket("bitcoin", 600)],
    });
    expect(snapshot?.othersMarketCapInUsd).toBe(0);
    expect(snapshot?.totalMarketCapInUsd).toBe(600);
  });

  it("공식 도미넌스를 그대로 쓰고, 없으면 직접 계산한 비중으로 대신한다", () => {
    const markets = [createMarket("bitcoin", 600)];
    expect(buildCoinMarketSnapshot({ ...baseParams, markets })?.bitcoinDominancePercent).toBe(59.5);
    expect(
      buildCoinMarketSnapshot({ ...baseParams, bitcoinDominancePercent: undefined, markets })
        ?.bitcoinDominancePercent,
    ).toBe(60);
  });

  it("비트코인이 없거나 전체 시총이 0 이면 null", () => {
    expect(
      buildCoinMarketSnapshot({ ...baseParams, markets: [createMarket("ethereum", 100)] }),
    ).toBeNull();
    expect(
      buildCoinMarketSnapshot({
        ...baseParams,
        totalMarketCapInUsd: 0,
        markets: [createMarket("bitcoin", 100)],
      }),
    ).toBeNull();
  });
});
