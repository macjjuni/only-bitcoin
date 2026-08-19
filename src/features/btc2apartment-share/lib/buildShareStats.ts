import type { ApartmentYearPoint } from "@/entities/apartment";

/**
 * 기준 연도로 삼기 위한 최소 거래 건수.
 *
 * 공유 카드의 변화율은 캡처되어 그대로 퍼지는 숫자다. 거래 1건짜리 해를 기준으로
 * 잡으면 "97.8% 싸졌다" 가 우연한 한 건 위에 서게 된다.
 */
const MIN_RELIABLE_DEAL_COUNT = 3;

/** 한 단위의 과거 → 현재 값 */
export interface UnitTrend {
  baseValue: number;
  currentValue: number;
  /** 기준 연도 대비 변화율(%) */
  changeRate: number;
}

/** 공유 카드가 그리는 값 전부 */
export interface ApartmentShareStats {
  baseYear: number;
  latestYear: number;
  /** 비트코인 개수 기준 — 줄어든다 */
  btc: UnitTrend;
  /** 원화 기준 — 늘어난다 */
  krw: UnitTrend;
  /**
   * 원화 기준 상승분이 비트코인 기준 하락분에 비해 몇 배인지.
   * "원화로는 3.6배 올랐지만 비트코인으로는 45분의 1" 같은 문장의 재료다.
   */
  btcCheaperMultiple: number;
}

interface YearValue {
  year: number;
  krw: number;
  btc: number;
}

/** 그 평형에서 KRW·BTC 값이 모두 있는 해만 추린다. 한쪽만 있으면 두 단위를 나란히 못 놓는다. */
function collectYearValues(
  yearPoints: ApartmentYearPoint[],
  areaInSquareMeter: number,
): Array<YearValue & { dealCount: number }> {
  const yearValues: Array<YearValue & { dealCount: number }> = [];

  for (const yearPoint of yearPoints) {
    const bucket = yearPoint.areaBuckets.find(
      (areaBucket) => areaBucket.areaInSquareMeter === areaInSquareMeter,
    );

    if (!bucket?.medianPriceInKrw || !bucket.medianPriceInBtc) {
      continue;
    }

    yearValues.push({
      year: yearPoint.year,
      krw: bucket.medianPriceInKrw,
      btc: bucket.medianPriceInBtc,
      dealCount: bucket.dealCount,
    });
  }

  return yearValues;
}

function toChangeRate(baseValue: number, currentValue: number): number {
  return ((currentValue - baseValue) / baseValue) * 100;
}

export interface BuildApartmentShareStatsParams {
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
  /** 실시간 BTC 원화 시세. 현재 BTC 개수 환산에만 쓴다. */
  bitcoinPriceInKrw: number;
}

/**
 * 공유 카드에 올릴 "같은 아파트, 같은 기간, 반대 방향" 수치를 만든다.
 *
 * 원화 기준으로는 오르고 비트코인 기준으로는 내리는 것이 이 카드의 전부이므로
 * 두 단위를 **같은 기준 연도**에서 뽑는다. 단위마다 기준 연도가 다르면
 * 두 변화율을 나란히 놓는 순간 비교가 성립하지 않는다.
 *
 * 비교가 불가능하면( 거래 연도가 하나뿐인 신축, 시세 미도착 ) `null` 을 돌려준다.
 */
export function buildApartmentShareStats({
  yearPoints,
  areaInSquareMeter,
  bitcoinPriceInKrw,
}: BuildApartmentShareStatsParams): ApartmentShareStats | null {
  if (areaInSquareMeter === null || bitcoinPriceInKrw <= 0) {
    return null;
  }

  const yearValues = collectYearValues(yearPoints, areaInSquareMeter);

  if (yearValues.length < 2) {
    return null;
  }

  const latest = yearValues[yearValues.length - 1];
  const reliableBase = yearValues.find(
    (yearValue) => yearValue.dealCount >= MIN_RELIABLE_DEAL_COUNT && yearValue.year < latest.year,
  );
  const base = reliableBase ?? yearValues[0];

  if (base.year >= latest.year) {
    return null;
  }

  /** 현재 BTC 개수만 실시간 시세로 환산한다. 과거 값은 각 거래일 시세로 환산된 값이다. */
  const currentBtc = latest.krw / bitcoinPriceInKrw;

  const btc: UnitTrend = {
    baseValue: base.btc,
    currentValue: currentBtc,
    changeRate: toChangeRate(base.btc, currentBtc),
  };
  const krw: UnitTrend = {
    baseValue: base.krw,
    currentValue: latest.krw,
    changeRate: toChangeRate(base.krw, latest.krw),
  };

  return {
    baseYear: base.year,
    latestYear: latest.year,
    btc,
    krw,
    btcCheaperMultiple: base.btc / currentBtc,
  };
}

/** 억 단위 축약. `5_825_000_000` → `"58.3"` */
export function formatKrwInEok(priceInKrw: number): string {
  return (priceInKrw / 100_000_000).toFixed(1);
}

/** BTC 개수 표기. 값이 클수록 소수 자리를 줄여 자릿수를 안정시킨다. */
export function formatBtcCount(btcCount: number): string {
  if (btcCount >= 1000) {
    return Math.round(btcCount).toLocaleString("en-US");
  }

  if (btcCount >= 100) {
    return btcCount.toFixed(0);
  }

  if (btcCount >= 10) {
    return btcCount.toFixed(1);
  }

  return btcCount.toFixed(2);
}

/** `45.6배` 처럼 쓸 배수 표기. 값이 크면 소수를 버린다. */
export function formatMultiple(multiple: number): string {
  return multiple >= 100 ? multiple.toFixed(0) : multiple.toFixed(1);
}
