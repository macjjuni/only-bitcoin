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

const collectedAtFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 자산 랭킹과 같은 `2026.11.10 · 11:36 KST` 형식. */
export const formatCollectedAt = (fetchedAt: string): string => {
  const collectedAt = new Date(fetchedAt);
  if (Number.isNaN(collectedAt.getTime())) {
    return "—";
  }

  const dateTimeParts = collectedAtFormatter.formatToParts(collectedAt);
  const findDateTimePart = (partType: Intl.DateTimeFormatPartTypes): string => {
    return dateTimeParts.find((part) => part.type === partType)?.value ?? "00";
  };

  return `${findDateTimePart("year")}.${findDateTimePart("month")}.${findDateTimePart("day")} · ${findDateTimePart("hour")}:${findDateTimePart("minute")} KST`;
};
