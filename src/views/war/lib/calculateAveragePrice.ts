import {
  type OrderFlowSnapshot,
  VENUE_IDS,
  VENUE_LABELS,
  type VenueId,
} from "@/entities/order-flow";
import { calcPremiumPercent } from "@/shared/utils/calculate";

export interface AveragePriceResult {
  averagePriceInUsd: number;
  averagePriceInKrw: number;
  /** 평균에 실제로 들어간 거래소. 연결이 끊긴 곳은 빠진다. */
  includedVenues: VenueId[];
  /** 원화 환산에 쓸 환율이 있었는지. 없으면 원화 평균이 0 이다. */
  hasExchangeRate: boolean;
  /** 김치 프리미엄(%). 국내·해외 어느 한쪽이라도 못 구하면 `null`. */
  kimchiPremiumPercent: number | null;
}

const KRW_CURRENCY = "KRW";

/**
 * 거래소 고유 통화 가격을 달러 기준으로 환산한다.
 *
 * Binance 는 USDT, Coinbase 는 USD 지만 이 앱은 이미 둘을 같은 "달러" 로 취급한다.
 * ( `entities/bitcoin` 의 `bitcoinPrice.usd` 도 선택한 거래소에 따라 둘 중 하나를 그대로 쓴다 )
 * 원화만 환율로 나눈다. 환산할 수 없으면 `null` 이라 평균에서 빠진다.
 */
function convertPriceToUsd(
  venue: VenueId,
  priceInQuote: number,
  usdKrwRate: number,
): number | null {
  if (priceInQuote <= 0) {
    return null;
  }

  if (VENUE_LABELS[venue].quoteCurrency !== KRW_CURRENCY) {
    return priceInQuote;
  }

  if (usdKrwRate <= 0) {
    return null;
  }

  return priceInQuote / usdKrwRate;
}

/**
 * 김치 프리미엄(%).
 *
 * 원화 거래소 가격이 해외 달러 시세를 환율로 환산한 값보다 얼마나 비싼지다.
 * 해외 기준값은 달러로 호가하는 거래소들의 평균이라, 한 곳이 끊겨도 남은 곳으로 계산된다.
 * 계산식은 `/premium` 페이지와 같은 `calcPremiumPercent` 를 그대로 쓴다. 같은 지표를
 * 두 화면이 다르게 말하면 안 되기 때문이다.
 *
 * 평균가와 달리 이 값은 **원화 거래소와 해외 거래소가 모두 살아 있어야** 의미가 있다.
 */
function calculateKimchiPremiumPercent(
  snapshot: OrderFlowSnapshot,
  usdKrwRate: number,
): number | null {
  if (usdKrwRate <= 0) {
    return null;
  }

  const livePricesByCurrency = { korea: [] as number[], global: [] as number[] };

  for (const venue of VENUE_IDS) {
    const venueMetrics = snapshot.venues[venue];

    if (venueMetrics.status !== "live" || venueMetrics.midPriceInQuote <= 0) {
      continue;
    }

    const priceGroup = VENUE_LABELS[venue].quoteCurrency === KRW_CURRENCY ? "korea" : "global";
    livePricesByCurrency[priceGroup].push(venueMetrics.midPriceInQuote);
  }

  if (livePricesByCurrency.korea.length === 0 || livePricesByCurrency.global.length === 0) {
    return null;
  }

  const averageKoreaPriceInKrw = calculateMean(livePricesByCurrency.korea);
  const averageGlobalPriceInUsd = calculateMean(livePricesByCurrency.global);

  return calcPremiumPercent(averageKoreaPriceInKrw, averageGlobalPriceInUsd, usdKrwRate);
}

/** 산술 평균. 빈 배열은 부르는 쪽에서 미리 걸러 낸다. */
function calculateMean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * 세 거래소 BTC 평균가.
 *
 * 통화가 달라 그대로는 못 더하므로 앱 전역 원·달러 환율로 기준을 맞춘 뒤 평균낸다.
 * 평균에는 `live` 인 거래소만 넣는다. 끊긴 거래소의 멈춘 가격이 평균을 끌고 가면
 * 화면이 조용히 거짓말을 하게 된다.
 *
 * @param usdKrwRate 원·달러 환율. 0 이하이면 원화 환산을 포기한다.
 */
export function calculateAveragePrice(
  snapshot: OrderFlowSnapshot,
  usdKrwRate: number,
): AveragePriceResult {
  const hasExchangeRate = usdKrwRate > 0;
  const includedVenues: VenueId[] = [];
  let totalPriceInUsd = 0;

  for (const venue of VENUE_IDS) {
    const venueMetrics = snapshot.venues[venue];

    if (venueMetrics.status !== "live") {
      continue;
    }

    const priceInUsd = convertPriceToUsd(venue, venueMetrics.midPriceInQuote, usdKrwRate);

    if (priceInUsd === null) {
      continue;
    }

    totalPriceInUsd += priceInUsd;
    includedVenues.push(venue);
  }

  if (includedVenues.length === 0) {
    return {
      averagePriceInUsd: 0,
      averagePriceInKrw: 0,
      includedVenues,
      hasExchangeRate,
      kimchiPremiumPercent: null,
    };
  }

  const averagePriceInUsd = totalPriceInUsd / includedVenues.length;

  return {
    averagePriceInUsd,
    averagePriceInKrw: hasExchangeRate ? averagePriceInUsd * usdKrwRate : 0,
    includedVenues,
    hasExchangeRate,
    kimchiPremiumPercent: calculateKimchiPremiumPercent(snapshot, usdKrwRate),
  };
}
