import type { ApartmentTrade } from "../model/types";

/** 'YYYY-MM-DD' → 그 날의 BTC 원화 종가 */
export type BtcDailyKrwMap = ReadonlyMap<string, number>;

/** 거래일 시세를 못 찾았을 때 거슬러 올라가 볼 최대 일수 ( 주말·거래정지 대응 ) */
const MAX_LOOKBACK_DAYS = 10;

/**
 * 거래일의 BTC 원화 시세를 찾는다.
 *
 * 정확히 그 날짜가 없으면 최대 10일 전까지 거슬러 올라간다.
 * 2017년 이전 구간은 소스가 일별이라도 결측이 있을 수 있어 필요한 장치다.
 */
export function findBtcPriceOnDate(
  btcDailyKrwMap: BtcDailyKrwMap,
  dealDate: string,
): number | null {
  const baseDate = new Date(`${dealDate}T00:00:00Z`);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  for (let daysBefore = 0; daysBefore <= MAX_LOOKBACK_DAYS; daysBefore += 1) {
    const target = new Date(baseDate);
    target.setUTCDate(target.getUTCDate() - daysBefore);

    const price = btcDailyKrwMap.get(target.toISOString().slice(0, 10));

    if (price !== undefined && price > 0) {
      return price;
    }
  }

  return null;
}

export interface BtcConversionResult {
  /** 거래별로 환산한 BTC 개수의 중앙값. 환산 가능한 거래가 없으면 null. */
  medianPriceInBtc: number | null;
  /** 환산에 성공한 거래 건수 */
  convertedDealCount: number;
}

/**
 * 거래를 각각 **그 거래일의 시세**로 환산한 뒤 중앙값을 낸다.
 *
 * 연평균·연말종가 같은 연도 대표 시세로 나누면 안 된다. 실측 오차:
 * - 은마 2021: 거래 27건 중 26건이 1~8월인데 BTC 고점은 10~11월이라 연평균이 -15.3% 어긋남
 * - 은마 2018: 연말 종가 기준이 +95.5% ( BTC 폭락 직후 하루가 그 해 전체를 대표해버림 )
 *
 * 환산 해상도는 일 단위, 집계 해상도는 연 단위로 분리하는 것이 이 함수의 요점이다.
 */
export function convertTradesToBtcMedian(
  trades: ApartmentTrade[],
  btcDailyKrwMap: BtcDailyKrwMap,
): BtcConversionResult {
  const btcCounts: number[] = [];

  for (const trade of trades) {
    const btcPriceInKrw = findBtcPriceOnDate(btcDailyKrwMap, trade.dealDate);

    // 시세를 못 구한 거래만 BTC 집계에서 빠진다. KRW 집계에는 그대로 남는다.
    if (btcPriceInKrw === null) {
      continue;
    }

    btcCounts.push(trade.priceInKrw / btcPriceInKrw);
  }

  if (btcCounts.length === 0) {
    return { medianPriceInBtc: null, convertedDealCount: 0 };
  }

  const sorted = btcCounts.sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[middleIndex]
      : (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;

  return { medianPriceInBtc: median, convertedDealCount: btcCounts.length };
}
