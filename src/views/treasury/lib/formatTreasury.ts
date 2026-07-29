/**
 * 한국어 큰 수 단위. 트레저리 금액은 조 단위를 넘나들어 `Intl` 의 compact 표기(`60B`)보다
 * 한국어 단위가 직관적이다.
 */
const KOREAN_LARGE_NUMBER_UNITS = [
  { threshold: 1e12, suffix: "조" },
  { threshold: 1e8, suffix: "억" },
  { threshold: 1e4, suffix: "만" },
] as const;

const KOREAN_LOCALE = "ko-KR";

/** 큰 수를 `1.2조`, `605.3억` 처럼 한국어 단위로 축약한다. 부호는 붙이지 않는다. */
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

/** 달러 금액을 `1.2조 달러` 처럼 축약한다. 음수는 앞에 `-` 를 붙인다. */
export function formatUsdCompact(valueInUsd: number): string {
  if (!Number.isFinite(valueInUsd) || valueInUsd === 0) {
    return "-";
  }

  const signPrefix = valueInUsd < 0 ? "-" : "";

  return `${signPrefix}${formatKoreanCompactNumber(valueInUsd)} 달러`;
}

/** 평가손익처럼 방향이 중요한 금액은 항상 부호를 붙인다. */
export function formatSignedUsdCompact(valueInUsd: number): string {
  if (!Number.isFinite(valueInUsd) || valueInUsd === 0) {
    return "-";
  }

  const signPrefix = valueInUsd < 0 ? "-" : "+";

  return `${signPrefix}${formatKoreanCompactNumber(valueInUsd)} 달러`;
}

/** 매입 평단가처럼 원 단위까지 의미 있는 값은 축약하지 않고 `$45,231` 로 표기한다. */
export function formatUsdPrice(priceInUsd: number): string {
  if (!Number.isFinite(priceInUsd) || priceInUsd <= 0) {
    return "-";
  }

  return `$${Math.round(priceInUsd).toLocaleString(KOREAN_LOCALE)}`;
}

/** BTC 보유량. 소수점은 버리고 정수로만 표기한다. */
export function formatBtcAmount(amountInBtc: number): string {
  if (!Number.isFinite(amountInBtc) || amountInBtc <= 0) {
    return "0 BTC";
  }

  return `${Math.round(amountInBtc).toLocaleString(KOREAN_LOCALE)} BTC`;
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
 * ISO 문자열을 KST 기준 `YYYY.MM.DD · HH:mm KST` 로 변환한다.
 *
 * 스냅샷 시각은 서버(UTC 일 수 있음)에서 찍히고 해외 사용자 브라우저에서도 렌더링되므로,
 * 로컬 타임존에 의존하는 `getHours` 계열 대신 `Intl` 로 타임존을 고정한다.
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

/** `NASDAQ:MSTR` 에서 거래소를 뗀 티커만 남긴다. */
export function extractTickerCode(tickerSymbol: string): string {
  if (!tickerSymbol) {
    return "-";
  }

  const [, tickerCode] = tickerSymbol.split(":");

  return tickerCode || tickerSymbol;
}

/**
 * ISO 3166-1 alpha-2 국가 코드를 국기 이모지로 변환한다.
 * 각 알파벳을 유니코드 Regional Indicator Symbol(U+1F1E6~) 로 옮기면 국기가 된다.
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
