import {
  type ApartmentTrade,
  DEFAULT_AREA_MIN_DEAL_RATIO,
  type LandmarkApartment,
  NATIONAL_AREA_IN_SQUARE_METER,
} from "../model/types";

/**
 * 전용면적을 정수 ㎡ 버킷으로 묶는다.
 *
 * `Math.round` 를 쓰면 안 된다. 국민평형의 실제 전용면적은 84.xx 가 압도적인데
 * ( 4개 구 표본에서 84.00~84.99 가 5,312건, 85.00 이상은 36건 )
 * 반올림하면 84.50 을 경계로 84 와 85 로 갈라진다.
 * 마포래미안푸르지오는 84.3884 / 84.5978 / 84.8919 가 섞여 있어 같은 평형 117건이
 * 두 버킷으로 쪼개지고 평형 칩도 `84㎡`·`85㎡` 두 개로 뜬다.
 */
export function toAreaBucket(exclusiveAreaInSquareMeter: number): number {
  return Math.floor(exclusiveAreaInSquareMeter);
}

/**
 * 중앙값. 평균 대신 쓰는 이유는 증여성 저가 직거래 방어다.
 *
 * 서초구 2024년 표본에서 직거래는 전체의 2.9% 였지만 같은 단지·평형의 중개거래 중앙값 대비
 * -25~-47% 로 **한 방향으로만** 쏠려 있었다. 거래가 30건인 해라면 평균이 1% 밀리는 정도지만,
 * 6건인 해에 -40% 한 건이 끼면 평균이 7% 왜곡된다. 중앙값은 그 한 건이 순위 끝으로 밀릴 뿐이다.
 */
export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex];
  }

  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

/** 거래가 이 랜드마크의 것인지 판별한다. 부분일치를 쓰면 유사 단지명이 섞인다. */
export function isTradeOfLandmark(trade: ApartmentTrade, landmark: LandmarkApartment): boolean {
  if (!landmark.aptNames.includes(trade.aptName)) {
    return false;
  }

  if (landmark.jibunList.length > 0 && !landmark.jibunList.includes(trade.jibun)) {
    return false;
  }

  return true;
}

/** 랜드마크에 해당하는 거래만 남긴다. */
export function filterLandmarkTrades(
  trades: ApartmentTrade[],
  landmark: LandmarkApartment,
): ApartmentTrade[] {
  return trades.filter((trade) => isTradeOfLandmark(trade, landmark));
}

/** 전용면적 버킷별로 거래를 나눈다. */
export function groupTradesByAreaBucket(trades: ApartmentTrade[]): Map<number, ApartmentTrade[]> {
  const grouped = new Map<number, ApartmentTrade[]>();

  for (const trade of trades) {
    const bucket = toAreaBucket(trade.exclusiveAreaInSquareMeter);
    const bucketTrades = grouped.get(bucket);

    if (bucketTrades) {
      bucketTrades.push(trade);
      continue;
    }

    grouped.set(bucket, [trade]);
  }

  return grouped;
}

/**
 * 기본으로 선택할 평형 버킷을 고른다.
 *
 * "84 버킷이 있으면 무조건 84" 로 하면 대형 위주 단지가 깨진다.
 * 타워팰리스1 은 84㎡ 비중이 3.8%( 26건 중 1건 )라 대부분의 연도가 거래 0건이 되어
 * 막대가 거의 그려지지 않는다. 84 를 쓰려면 최소한의 표본 비중을 만족해야 한다.
 */
export function selectDefaultAreaBucket(trades: ApartmentTrade[]): number | null {
  if (trades.length === 0) {
    return null;
  }

  const grouped = groupTradesByAreaBucket(trades);
  const nationalAreaTrades = grouped.get(NATIONAL_AREA_IN_SQUARE_METER);
  const nationalAreaRatio = (nationalAreaTrades?.length ?? 0) / trades.length;

  if (nationalAreaRatio >= DEFAULT_AREA_MIN_DEAL_RATIO) {
    return NATIONAL_AREA_IN_SQUARE_METER;
  }

  let mostTradedBucket = null as number | null;
  let mostTradedCount = 0;

  for (const [bucket, bucketTrades] of grouped) {
    if (bucketTrades.length > mostTradedCount) {
      mostTradedBucket = bucket;
      mostTradedCount = bucketTrades.length;
    }
  }

  return mostTradedBucket;
}
