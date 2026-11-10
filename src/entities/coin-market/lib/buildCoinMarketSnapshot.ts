import type {
  CoinGeckoMarketResponseItem,
  CoinMarketItem,
  CoinMarketSnapshot,
} from "../model/types";

interface BuildCoinMarketSnapshotParams {
  markets: CoinGeckoMarketResponseItem[];
  totalMarketCapInUsd: number;
  /** `/global` 의 공식 도미넌스. 없으면 직접 계산한 비중으로 대신함. */
  bitcoinDominancePercent: number | null | undefined;
  stablecoinIds: ReadonlySet<string>;
  fetchedAt: string;
}

// region [Privates]
const isPositiveNumber = (value: number | null | undefined): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};

const normalizeMarketItem = (
  market: CoinGeckoMarketResponseItem,
  stablecoinIds: ReadonlySet<string>,
): CoinMarketItem | null => {
  if (!isPositiveNumber(market.market_cap) || !market.id || !market.name || !market.symbol) {
    return null;
  }

  const dailyChangePercent = market.price_change_percentage_24h;

  return {
    id: market.id,
    rank: 0,
    name: market.name,
    symbol: market.symbol.toUpperCase(),
    marketCapInUsd: market.market_cap,
    priceInUsd: market.current_price ?? 0,
    dailyChangePercent:
      typeof dailyChangePercent === "number" && Number.isFinite(dailyChangePercent)
        ? dailyChangePercent
        : null,
    isStablecoin: stablecoinIds.has(market.id),
  };
};
// endregion

// region [Transactions]
/**
 * CoinGecko 응답을 화면용 스냅샷으로 정리함.
 * 시총 없는 항목은 버리고, 순위는 정렬 결과로 다시 매김. API rank 는 null 일 때가 있음.
 * BTC 가 없거나 전체 시총이 이상하면 null.
 */
export const buildCoinMarketSnapshot = ({
  markets,
  totalMarketCapInUsd,
  bitcoinDominancePercent,
  stablecoinIds,
  fetchedAt,
}: BuildCoinMarketSnapshotParams): CoinMarketSnapshot | null => {
  const coins = markets
    .map((market) => normalizeMarketItem(market, stablecoinIds))
    .filter((coin): coin is CoinMarketItem => coin !== null)
    .sort((a, b) => b.marketCapInUsd - a.marketCapInUsd)
    .map((coin, index) => ({ ...coin, rank: index + 1 }));

  const bitcoin = coins.find((coin) => coin.id === "bitcoin");
  if (!bitcoin || !isPositiveNumber(totalMarketCapInUsd)) {
    return null;
  }

  const topMarketCapInUsd = coins.reduce((sum, coin) => sum + coin.marketCapInUsd, 0);
  const resolvedTotalMarketCapInUsd = Math.max(totalMarketCapInUsd, topMarketCapInUsd);

  return {
    coins,
    totalMarketCapInUsd: resolvedTotalMarketCapInUsd,
    bitcoinDominancePercent: isPositiveNumber(bitcoinDominancePercent)
      ? bitcoinDominancePercent
      : (bitcoin.marketCapInUsd / resolvedTotalMarketCapInUsd) * 100,
    othersMarketCapInUsd: Math.max(0, totalMarketCapInUsd - topMarketCapInUsd),
    fetchedAt,
    hasFetchFailed: false,
  };
};
// endregion
