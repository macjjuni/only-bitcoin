import type { CoinMarketSnapshot } from "../model/types";

export type CoinMapTileKind = "bitcoin" | "coin" | "stablecoin" | "others";

export interface CoinMapTile {
  id: string;
  /** 트리맵 칸 첫 줄. 코인은 티커, 기타는 한글 라벨. */
  label: string;
  name: string;
  rank: number | null;
  kind: CoinMapTileKind;
  marketCapInUsd: number;
  /** 전체 시총 대비 비중(%). */
  sharePercent: number;
  dailyChangePercent: number | null;
}

export interface CoinMapSummary {
  tiles: CoinMapTile[];
}

export const OTHERS_TILE_ID = "others";

// region [Privates]
/**
 * 화면에 찍는 소수 둘째 자리로 미리 반올림함.
 * 안 그러면 -0.004 가 `-0.00%` 로 찍히고 색도 빨갛게 칠해짐.
 */
const roundToDisplayedChange = (dailyChangePercent: number | null): number | null => {
  if (dailyChangePercent === null) {
    return null;
  }
  const rounded = Math.round(dailyChangePercent * 100) / 100;
  return rounded === 0 ? 0 : rounded;
};

const toSharePercent = (value: number, total: number): number => {
  return total > 0 ? (value / total) * 100 : 0;
};
// endregion

// region [Transactions]
/**
 * 스냅샷을 트리맵 칸으로 바꿈.
 * 칸 비중의 분모는 전체 시총이라 상위 칸 + 기타 합이 100% 가 됨.
 */
export const buildCoinMapSummary = (snapshot: CoinMarketSnapshot): CoinMapSummary => {
  const { coins, totalMarketCapInUsd, othersMarketCapInUsd } = snapshot;

  const coinTiles = coins.map(
    (coin): CoinMapTile => ({
      id: coin.id,
      label: coin.symbol,
      name: coin.name,
      rank: coin.rank,
      kind: coin.id === "bitcoin" ? "bitcoin" : coin.isStablecoin ? "stablecoin" : "coin",
      marketCapInUsd: coin.marketCapInUsd,
      sharePercent: toSharePercent(coin.marketCapInUsd, totalMarketCapInUsd),
      dailyChangePercent: roundToDisplayedChange(coin.dailyChangePercent),
    }),
  );
  const othersTile: CoinMapTile = {
    id: OTHERS_TILE_ID,
    label: "기타",
    name: `${coins.length + 1}위 이하 전체`,
    rank: null,
    kind: "others",
    marketCapInUsd: othersMarketCapInUsd,
    sharePercent: toSharePercent(othersMarketCapInUsd, totalMarketCapInUsd),
    dailyChangePercent: null,
  };

  return {
    tiles: othersMarketCapInUsd > 0 ? [...coinTiles, othersTile] : coinTiles,
  };
};
// endregion
