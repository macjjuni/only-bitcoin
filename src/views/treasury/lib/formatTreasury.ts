/**
 * 한국어 큰 수 단위. 트레저리 금액이 조 단위를 넘나들어
 * `Intl` 의 compact 표기(`60B`)보다 한국어 단위가 직관적임.
 */
const KOREAN_LARGE_NUMBER_UNITS = [
  { threshold: 1e12, suffix: "조" },
  { threshold: 1e8, suffix: "억" },
  { threshold: 1e4, suffix: "만" },
] as const;

const KOREAN_LOCALE = "ko-KR";

/** 큰 수를 `1.2조`, `605.3억` 처럼 한국어 단위로 축약함. 부호는 안 붙임. */
function formatKoreanCompactNumber(value: number): string {
  const absoluteValue = Math.abs(value);
  const matchedUnit = KOREAN_LARGE_NUMBER_UNITS.find(({ threshold }) => absoluteValue >= threshold);

  if (!matchedUnit) {
    return Math.round(absoluteValue).toLocaleString(KOREAN_LOCALE);
  }

  const scaledValue = absoluteValue / matchedUnit.threshold;
  const roundedValue = Math.round(scaledValue * 10) / 10;

  return `${roundedValue.toLocaleString(KOREAN_LOCALE)}${matchedUnit.suffix}`;
}

/** 달러 금액을 `1.2조 달러` 처럼 축약함. 음수는 앞에 `-` 를 붙임. */
export function formatUsdCompact(valueInUsd: number): string {
  if (!Number.isFinite(valueInUsd) || valueInUsd === 0) {
    return "-";
  }

  const signPrefix = valueInUsd < 0 ? "-" : "";

  return `${signPrefix}${formatKoreanCompactNumber(valueInUsd)} 달러`;
}

/** 평가손익처럼 방향이 중요한 금액은 항상 부호를 붙임. */
export function formatSignedUsdCompact(valueInUsd: number): string {
  if (!Number.isFinite(valueInUsd) || valueInUsd === 0) {
    return "-";
  }

  const signPrefix = valueInUsd < 0 ? "-" : "+";

  return `${signPrefix}${formatKoreanCompactNumber(valueInUsd)} 달러`;
}

/** 매입 평단가처럼 원 단위까지 의미 있는 값은 축약 없이 `$45,231` 로 씀. */
export function formatUsdPrice(priceInUsd: number): string {
  if (!Number.isFinite(priceInUsd) || priceInUsd <= 0) {
    return "-";
  }

  return `$${Math.round(priceInUsd).toLocaleString(KOREAN_LOCALE)}`;
}

/** BTC 수량. 단위를 따로 꾸며 붙이는 자리( 요약 카드 히어로 )에서 씀. */
export function formatBtcCount(amountInBtc: number): string {
  if (!Number.isFinite(amountInBtc) || amountInBtc <= 0) {
    return "0";
  }

  return Math.round(amountInBtc).toLocaleString(KOREAN_LOCALE);
}

/** BTC 보유량. 소수점은 버리고 정수로만 씀. */
export function formatBtcAmount(amountInBtc: number): string {
  return `${formatBtcCount(amountInBtc)} BTC`;
}

/** 비중처럼 부호가 필요 없는 퍼센트 값. */
export function formatPercent(percentValue: number, fractionDigits = 2): string {
  if (!Number.isFinite(percentValue)) {
    return "-";
  }

  return `${percentValue.toFixed(fractionDigits)}%`;
}

/** 수익률처럼 방향이 중요한 퍼센트 값. */
export function formatSignedPercent(percentValue: number, fractionDigits = 1): string {
  if (!Number.isFinite(percentValue) || percentValue === 0) {
    return "-";
  }

  const signPrefix = percentValue > 0 ? "+" : "";

  return `${signPrefix}${percentValue.toFixed(fractionDigits)}%`;
}

/**
 * ISO 문자열을 KST 기준 `YYYY.MM.DD · HH:mm KST` 로 바꿈.
 *
 * 스냅샷 시각은 서버( UTC 일 수 있음 )에서 찍히고 해외 브라우저에서도 렌더링됨.
 * 그래서 로컬 타임존을 타는 `getHours` 계열 대신 `Intl` 로 타임존을 고정함.
 */
export function formatKstDateTime(isoDateTime: string): string {
  const parsedDate = new Date(isoDateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const dateTimeParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsedDate);

  const findDateTimePartValue = (partType: Intl.DateTimeFormatPartTypes): string => {
    return dateTimeParts.find((part) => part.type === partType)?.value ?? "00";
  };

  const year = findDateTimePartValue("year");
  const month = findDateTimePartValue("month");
  const day = findDateTimePartValue("day");
  const hour = findDateTimePartValue("hour");
  const minute = findDateTimePartValue("minute");

  return `${year}.${month}.${day} · ${hour}:${minute} KST`;
}

/** `NASDAQ:MSTR` 에서 거래소를 뗀 티커만 남김. */
export function extractTickerCode(tickerSymbol: string): string {
  if (!tickerSymbol) {
    return "-";
  }

  const [, tickerCode] = tickerSymbol.split(":");

  return tickerCode || tickerSymbol;
}

/**
 * ISO 3166-1 alpha-2 국가 코드를 국기 이모지로 바꿈.
 * 각 알파벳을 유니코드 Regional Indicator Symbol(U+1F1E6~) 로 옮기면 국기가 됨.
 */
export function convertCountryCodeToFlagEmoji(countryCode: string): string {
  const REGIONAL_INDICATOR_OFFSET = 0x1f1e6;
  const UPPERCASE_A_CHAR_CODE = 65;

  if (!/^[A-Za-z]{2}$/.test(countryCode)) {
    return "🏳️";
  }

  return countryCode
    .toUpperCase()
    .split("")
    .map((letter) => {
      return String.fromCodePoint(
        letter.charCodeAt(0) - UPPERCASE_A_CHAR_CODE + REGIONAL_INDICATOR_OFFSET,
      );
    })
    .join("");
}
