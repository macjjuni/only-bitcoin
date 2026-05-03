import fetcher from '@/shared/utils/fetcher';
import type { BlockchainChartResponseData, MarketChartFormattedData } from '@/shared/types/api/marketChart';


const BLOCKCHAIN_MARKET_PRICE_URL = 'https://api.blockchain.info/charts/market-price';


/**
 * Blockchain.com 전체 비트코인 가격 히스토리 (2009~ )
 * - 응답의 x는 초 단위 → ms로 변환
 */
export async function fetchBlockchainMarketPriceAll(): Promise<MarketChartFormattedData> {

  const searchParams = new URLSearchParams({
    timespan: 'all',
    format: 'json',
    cors: 'true',
  });

  const data = await fetcher<BlockchainChartResponseData>(
    `${BLOCKCHAIN_MARKET_PRICE_URL}?${searchParams.toString()}`,
  );

  return {
    date: data.values.map((point) => point.x * 1000),
    price: data.values.map((point) => Math.floor(point.y)),
  };
}
