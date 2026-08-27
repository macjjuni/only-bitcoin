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

/** AUM처럼 방향이 없는 달러 금액을 축약 표기로 바꾼다. */
export const formatEtfAumInUsd = (valueInUsd: number | null): string => {
  if (valueInUsd === null || !Number.isFinite(valueInUsd) || valueInUsd <= 0) {
    return "-";
  }

  return formatAbsoluteUsdCompact(valueInUsd);
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
