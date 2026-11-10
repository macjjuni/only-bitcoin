import { describe, expect, it } from "vitest";
import type { CoinMarketItem, CoinMarketSnapshot } from "@/entities/coin-market";
import { buildCoinMapSummary, OTHERS_TILE_ID } from "./buildCoinMapSummary";

const createCoin = (
  id: string,
  rank: number,
  marketCapInUsd: number,
  isStablecoin = false,
): CoinMarketItem => ({
  id,
  rank,
  name: id,
  symbol: id.toUpperCase(),
  marketCapInUsd,
  priceInUsd: 1,
  dailyChangePercent: 0,
  isStablecoin,
});

const createSnapshot = (overrides: Partial<CoinMarketSnapshot> = {}): CoinMarketSnapshot => ({
  coins: [createCoin("bitcoin", 1, 600), createCoin("tether", 2, 200, true)],
  totalMarketCapInUsd: 1000,
  othersMarketCapInUsd: 200,
  bitcoinDominancePercent: 59.5,
  fetchedAt: "2026-11-10T00:00:00.000Z",
  hasFetchFailed: false,
  ...overrides,
});

describe("buildCoinMapSummary", () => {
  it("칸 종류와 전체 대비 비중을 매긴다", () => {
    const summary = buildCoinMapSummary(createSnapshot());
    expect(summary.tiles.map((tile) => [tile.id, tile.kind, tile.sharePercent])).toEqual([
      ["bitcoin", "bitcoin", 60],
      ["tether", "stablecoin", 20],
      [OTHERS_TILE_ID, "others", 20],
    ]);
    expect(summary.tiles.at(-1)?.name).toBe("3위 이하 전체");
  });

  it("표시 자릿수 아래 등락은 0 으로 반올림해 -0.00% 가 안 나온다", () => {
    const summary = buildCoinMapSummary(
      createSnapshot({ coins: [{ ...createCoin("bitcoin", 1, 600), dailyChangePercent: -0.004 }] }),
    );
    expect(Object.is(summary.tiles[0].dailyChangePercent, 0)).toBe(true);
  });

  it("기타가 0 이면 기타 칸을 빼서 빈 칸이 안 생긴다", () => {
    const summary = buildCoinMapSummary(createSnapshot({ othersMarketCapInUsd: 0 }));
    expect(summary.tiles.some((tile) => tile.id === OTHERS_TILE_ID)).toBe(false);
  });
});
