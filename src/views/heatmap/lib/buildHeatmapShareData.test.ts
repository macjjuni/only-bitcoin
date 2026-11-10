import { describe, expect, it } from "vitest";
import type { CoinMapTile } from "./buildCoinMapSummary";
import { buildHeatmapShareData } from "./buildHeatmapShareData";
import { resolveNeutralTileFill } from "./resolveTileColor";

const createTile = (overrides: Partial<CoinMapTile>): CoinMapTile => ({
  id: "bitcoin",
  label: "BTC",
  name: "Bitcoin",
  rank: 1,
  kind: "bitcoin",
  marketCapInUsd: 600,
  sharePercent: 60,
  dailyChangePercent: -1.5,
  ...overrides,
});

const tiles = [
  createTile({}),
  createTile({
    id: "others",
    label: "기타",
    kind: "others",
    rank: null,
    sharePercent: 40,
    dailyChangePercent: null,
    marketCapInUsd: 400,
  }),
];

describe("buildHeatmapShareData", () => {
  const shareData = buildHeatmapShareData({
    tiles,
    totalMarketCapInUsd: 1000,
    bitcoinDominancePercent: 59.61,
    fetchedAt: "2026-11-10T03:00:00.000Z",
  });

  it("비트코인 요약 문구와 등락 방향을 만든다", () => {
    // 칸 비중( 60% )이 아니라 공식 도미넌스를 씀.
    expect(shareData.bitcoinDominanceLabel).toBe("59.6%");
    expect(shareData.bitcoinChangeLabel).toBe("-1.50%");
    expect(shareData.bitcoinChangeTone).toBe("down");
    expect(shareData.collectedAtLabel).toBe("2026.11.10 · 12:00 KST");
  });

  it("코인 칸은 등락률, 기타 칸은 비중을 둘째 줄에 쓰고 다크 색을 쓴다", () => {
    expect(shareData.tiles[0]).toMatchObject({ valueLabel: "-1.50%", isBitcoin: true, value: 600 });
    expect(shareData.tiles[1]).toMatchObject({
      valueLabel: "40.0%",
      isBitcoin: false,
      fillColor: resolveNeutralTileFill(true),
    });
  });
});
