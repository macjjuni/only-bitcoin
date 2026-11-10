const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export const formatCompactUsd = (valueInUsd: number): string => {
  return compactUsdFormatter.format(valueInUsd);
};

/** 1% 미만은 소수 둘째 자리까지 보여야 0.0% 로 뭉개지지 않음. */
export const formatSharePercent = (sharePercent: number): string => {
  return `${sharePercent.toFixed(sharePercent < 1 ? 2 : 1)}%`;
};

export const formatDailyChange = (dailyChangePercent: number | null): string => {
  if (dailyChangePercent === null) {
    return "—";
  }
  const sign = dailyChangePercent > 0 ? "+" : "";
  return `${sign}${dailyChangePercent.toFixed(2)}%`;
};
