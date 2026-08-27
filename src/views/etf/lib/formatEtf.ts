const KOREAN_LOCALE = "ko-KR";

const formatAbsoluteUsdCompact = (absoluteValueInUsd: number): string => {
  if (absoluteValueInUsd >= 1e12) {
    return `$${(absoluteValueInUsd / 1e12).toFixed(2)}T`;
  }

  if (absoluteValueInUsd >= 1e9) {
    return `$${(absoluteValueInUsd / 1e9).toFixed(2)}B`;
  }

  if (absoluteValueInUsd >= 1e6) {
    return `$${(absoluteValueInUsd / 1e6).toFixed(1)}M`;
  }

  if (absoluteValueInUsd >= 1e3) {
    return `$${(absoluteValueInUsd / 1e3).toFixed(1)}K`;
  }

  return `$${Math.round(absoluteValueInUsd).toLocaleString(KOREAN_LOCALE)}`;
};

/** 방향이 있는 ETF 흐름 금액을 달러 축약 표기로 바꾼다. */
export const formatSignedEtfFlowInUsd = (valueInUsd: number): string => {
  if (!Number.isFinite(valueInUsd) || valueInUsd === 0) {
    return "$0";
  }

  const signPrefix = valueInUsd > 0 ? "+" : "−";

  return `${signPrefix}${formatAbsoluteUsdCompact(Math.abs(valueInUsd))}`;
};

/** USD 흐름을 원화 한국식 단위로 변환해 방향과 함께 표시한다. */
export const formatSignedEtfFlowInKrw = (valueInUsd: number, usdExRate: number): string => {
  if (!Number.isFinite(valueInUsd) || !Number.isFinite(usdExRate) || usdExRate <= 0) {
    return "-";
  }

  const valueInKrw = Math.abs(valueInUsd * usdExRate);
  const signPrefix = valueInUsd > 0 ? "+" : valueInUsd < 0 ? "−" : "";
  const formattedValue =
    valueInKrw >= 1e12
      ? `${(valueInKrw / 1e12).toFixed(1)}조 원`
      : valueInKrw >= 1e8
        ? `${(valueInKrw / 1e8).toFixed(1)}억 원`
        : `${Math.round(valueInKrw).toLocaleString(KOREAN_LOCALE)}원`;

  return `${signPrefix}${formattedValue}`;
};

/** AUM처럼 방향이 없는 달러 금액을 축약 표기로 바꾼다. */
export const formatEtfAumInUsd = (valueInUsd: number | null): string => {
  if (valueInUsd === null || !Number.isFinite(valueInUsd) || valueInUsd <= 0) {
    return "-";
  }

  return formatAbsoluteUsdCompact(valueInUsd);
};

/** USD 운용자산을 원화 환율로 환산해 한국식 단위로 표시한다. */
export const formatEtfAumInKrw = (valueInUsd: number | null, usdExRate: number): string => {
  if (
    valueInUsd === null ||
    !Number.isFinite(valueInUsd) ||
    valueInUsd <= 0 ||
    !Number.isFinite(usdExRate) ||
    usdExRate <= 0
  ) {
    return "-";
  }

  const valueInKrw = valueInUsd * usdExRate;

  if (valueInKrw >= 1e12) return `${(valueInKrw / 1e12).toFixed(1)}조 원`;
  if (valueInKrw >= 1e8) return `${(valueInKrw / 1e8).toFixed(1)}억 원`;
  if (valueInKrw >= 1e4)
    return `${Math.round(valueInKrw / 1e4).toLocaleString(KOREAN_LOCALE)}만 원`;

  return `${Math.round(valueInKrw).toLocaleString(KOREAN_LOCALE)}원`;
};

/** BTC 보유량을 최대 소수 둘째 자리까지 표시한다. */
export const formatEtfHoldingsInBtc = (holdingsInBtc: number | null): string => {
  if (holdingsInBtc === null || !Number.isFinite(holdingsInBtc) || holdingsInBtc < 0) {
    return "-";
  }

  return `${holdingsInBtc.toLocaleString(KOREAN_LOCALE, {
    maximumFractionDigits: 2,
  })} BTC`;
};

/** ISO 날짜를 `YYYY.MM.DD` 형태로 표시한다. */
export const formatEtfDate = (isoDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return "-";
  }

  return isoDate.replaceAll("-", ".");
};

/** ISO 시각을 한국 시간 기준 `YYYY.MM.DD HH:mm` 형식으로 표시한다. */
export const formatEtfUpdatedAt = (isoTimestamp: string): string => {
  const timestamp = new Date(isoTimestamp);

  if (Number.isNaN(timestamp.getTime())) {
    return "-";
  }

  const dateTimeParts = Object.fromEntries(
    new Intl.DateTimeFormat(KOREAN_LOCALE, {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(timestamp)
      .map(({ type, value }) => [type, value]),
  );

  return `${dateTimeParts.year}.${dateTimeParts.month}.${dateTimeParts.day} ${dateTimeParts.hour}:${dateTimeParts.minute}`;
};

/** ISO 날짜를 차트 축의 `M/D` 형태로 줄인다. */
export const formatEtfChartDate = (isoDate: string): string => {
  const [, month, day] = isoDate.split("-");

  if (!month || !day) {
    return "-";
  }

  return `${Number(month)}/${Number(day)}`;
};

/** ISO 날짜를 전체 기간 차트 축의 `YY.MM.DD` 형태로 줄인다. */
export const formatEtfChartDateWithYear = (isoDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return "-";
  }

  return isoDate.slice(2).replaceAll("-", ".");
};
