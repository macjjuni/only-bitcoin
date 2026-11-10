const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
export const formatMarketCap = (marketCapInUsd: number): string => {
  return compactUsdFormatter.format(marketCapInUsd);
};

export const formatAssetPrice = (priceInUsd: number): string => {
  return priceFormatter.format(priceInUsd);
};

export const formatDailyChange = (dailyChangePercent: number | null): string => {
  if (dailyChangePercent === null) {
    return "—";
  }
  const sign = dailyChangePercent > 0 ? "+" : "";
  return `${sign}${dailyChangePercent.toFixed(2)}%`;
};
