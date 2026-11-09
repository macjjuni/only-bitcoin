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
const collectedAtFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
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

export const formatCollectedAt = (fetchedAt: string): string => {
  const collectedAt = new Date(fetchedAt);
  if (Number.isNaN(collectedAt.getTime())) {
    return "—";
  }

  const dateTimeParts = collectedAtFormatter.formatToParts(collectedAt);
  const findDateTimePart = (partType: Intl.DateTimeFormatPartTypes): string => {
    return dateTimeParts.find((part) => part.type === partType)?.value ?? "00";
  };
  const year = findDateTimePart("year");
  const month = findDateTimePart("month");
  const day = findDateTimePart("day");
  const hour = findDateTimePart("hour");
  const minute = findDateTimePart("minute");

  return `${year}.${month}.${day} · ${hour}:${minute} KST`;
};
