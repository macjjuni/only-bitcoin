const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MONTH = 2_629_746; // 그레고리력 평균 한 달
const SECONDS_PER_YEAR = 31_556_952; // 그레고리력 평균 한 해 (365.2425일)

/** `toFixed` 가 허용하는 소수 자릿수 상한. 초과 시 RangeError 가 발생한다. */
const MAX_FIXED_DIGITS = 100;

/** 확률 표기에서 남길 유효숫자 개수. 앞의 0 개수와 무관하게 이만큼은 보이게 한다. */
const SIGNIFICANT_DIGITS = 3;

/**
 * 한국어 큰 수 단위. `Intl` 의 compact 표기는 경(10¹⁶) 이상을 `77,000조` 로 풀어써서
 * 솔로 마이닝처럼 자릿수가 큰 값에 쓸 수 없다.
 */
const KOREAN_LARGE_NUMBER_UNITS = [
  { threshold: 1e20, suffix: "해" },
  { threshold: 1e16, suffix: "경" },
  { threshold: 1e12, suffix: "조" },
  { threshold: 1e8, suffix: "억" },
  { threshold: 1e4, suffix: "만" },
] as const;

/** 해(10²⁰) 단위로도 표기가 길어지는 값은 지수 표기로 넘긴다. */
const EXPONENTIAL_NOTATION_THRESHOLD = 1e24;

const toExponentialNotation = (value: number): string => {
  return value.toExponential(1).replace("e+", " × 10^");
};

/** 큰 수를 `1.3경`, `890억` 처럼 한국어 단위로 축약한다. */
function formatKoreanCompactNumber(value: number): string {
  if (value >= EXPONENTIAL_NOTATION_THRESHOLD) {
    return toExponentialNotation(value);
  }

  const matchedUnit = KOREAN_LARGE_NUMBER_UNITS.find(({ threshold }) => value >= threshold);

  if (!matchedUnit) {
    // 한 자릿수에서 반올림하면 2.5 가 3 이 되어 배율 비교가 뭉개진다.
    if (value < 10) {
      return (Math.round(value * 10) / 10).toLocaleString("ko-KR");
    }
    return Math.round(value).toLocaleString("ko-KR");
  }

  const scaledValue = value / matchedUnit.threshold;
  const roundedValue = Math.round(scaledValue * 10) / 10;

  return `${roundedValue.toLocaleString("ko-KR")}${matchedUnit.suffix}`;
}

/**
 * 확률(0~1)을 퍼센트 문자열로 변환한다.
 *
 * 솔로 마이닝 확률은 소수점 아래 0 이 열 개 넘게 붙으므로 자릿수를 고정하면 전부 `0.00%` 가 된다.
 * 앞의 0 개수를 세어 유효숫자 3자리가 남도록 소수 자릿수를 적응시킨다.
 */
export function formatProbabilityPercent(probability: number): string {
  if (!Number.isFinite(probability) || probability <= 0) {
    return "0%";
  }

  const percent = probability * 100;

  if (percent >= 100) {
    return "100%";
  }
  if (percent >= 0.01) {
    return `${percent.toFixed(4)}%`;
  }

  const leadingZeroCount = Math.max(0, -Math.floor(Math.log10(percent)) - 1);
  const fractionDigits = Math.min(leadingZeroCount + SIGNIFICANT_DIGITS, MAX_FIXED_DIGITS);

  return `${percent.toFixed(fractionDigits)}%`;
}

/**
 * 확률을 `1 / 890억` 형태의 보조 표기로 변환한다.
 * 0 을 세지 않고도 기간·장비 간 비교가 가능하도록 퍼센트와 함께 노출한다.
 */
export function formatOddsRatio(probability: number): string {
  if (!Number.isFinite(probability) || probability <= 0) {
    return "-";
  }

  const oddsDenominator = 1 / probability;

  if (oddsDenominator < 1) {
    return "1 / 1";
  }

  return `1 / ${formatKoreanCompactNumber(oddsDenominator)}`;
}

/**
 * 초 단위 시간을 사람이 읽는 문자열로 변환한다.
 * 만 년이 넘어가면 한국어 축약 단위(만/억/조)로 표기한다.
 */
export function formatDurationFromSeconds(durationInSeconds: number): string {
  if (!Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
    return "∞";
  }

  if (durationInSeconds < SECONDS_PER_MINUTE) {
    return `${Math.round(durationInSeconds)}초`;
  }
  if (durationInSeconds < SECONDS_PER_HOUR) {
    return `${Math.round(durationInSeconds / SECONDS_PER_MINUTE)}분`;
  }
  if (durationInSeconds < SECONDS_PER_DAY) {
    return `${Math.round(durationInSeconds / SECONDS_PER_HOUR)}시간`;
  }
  if (durationInSeconds < SECONDS_PER_MONTH) {
    return `${Math.round(durationInSeconds / SECONDS_PER_DAY)}일`;
  }
  if (durationInSeconds < SECONDS_PER_YEAR) {
    return `${Math.round(durationInSeconds / SECONDS_PER_MONTH)}개월`;
  }

  const durationInYears = durationInSeconds / SECONDS_PER_YEAR;

  return `${formatKoreanCompactNumber(durationInYears)}년`;
}

/**
 * 로또 1등 대비 배율을 읽기 쉬운 문구로 바꾼다.
 * 1배 미만이면 역수를 취해 "1/N 수준"으로 표현한다.
 */
export function formatLotteryComparison(lotteryMultiple: number): string {
  if (!Number.isFinite(lotteryMultiple) || lotteryMultiple <= 0) {
    return "-";
  }

  if (lotteryMultiple >= 1) {
    return `로또 1등의 약 ${formatKoreanCompactNumber(lotteryMultiple)}배`;
  }

  return `로또 1등의 약 1/${formatKoreanCompactNumber(1 / lotteryMultiple)} 수준`;
}
