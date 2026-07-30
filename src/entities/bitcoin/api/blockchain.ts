import fetcher from "@/shared/utils/fetcher";
import type { BlockchainChartResponseData, MarketChartFormattedData } from "../model/market";

const BLOCKCHAIN_MARKET_PRICE_URL = "https://api.blockchain.info/charts/market-price";

/**
 * Blockchain.com 전체 비트코인 가격 히스토리 (2009~ )
 * - 응답의 x는 초 단위 → ms로 변환
 */
export async function fetchBlockchainMarketPriceAll(): Promise<MarketChartFormattedData> {
  const searchParams = new URLSearchParams({
    timespan: "all",
    format: "json",
    cors: "true",
  });

  const data = await fetcher<BlockchainChartResponseData>(
    `${BLOCKCHAIN_MARKET_PRICE_URL}?${searchParams.toString()}`,
  );

  return {
    date: data.values.map((point) => point.x * 1000),
    price: data.values.map((point) => Math.floor(point.y)),
  };
}

const MILLISECONDS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;

/**
 * 전체 히스토리 시계열에서 최근 N년 구간만 잘라 반환하는 순수 함수.
 *
 * 바이낸스 BTCUSDT 는 2017-08 상장이라 10년 구간을 채울 수 없어 이 소스를 사용한다.
 * `timespan` 파라미터로 기간을 좁히는 대신 전체 히스토리 응답을 잘라내므로 10Y 와 All 이
 * 동일한 쿼리 캐시를 공유할 수 있고, 파라미터 표기 차이에 따른 실패 가능성도 없다.
 */
export function sliceRecentYears(
  { date, price }: MarketChartFormattedData,
  years: number,
): MarketChartFormattedData {
  const startTimestamp = Date.now() - years * MILLISECONDS_PER_YEAR;
  const startIndex = date.findIndex((timestamp) => timestamp >= startTimestamp);

  // 요청 구간이 전체 히스토리를 덮으면( 또는 비어 있으면 ) 그대로 반환한다.
  if (startIndex <= 0) {
    return { date, price };
  }

  return {
    date: date.slice(startIndex),
    price: price.slice(startIndex),
  };
}
