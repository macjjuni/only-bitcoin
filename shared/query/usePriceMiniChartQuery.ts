import { useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { kToast } from 'kku-ui';
import fetcher from '@/shared/utils/fetcher';
import { isDev } from '@/shared/utils/common';
import { MarketChartFormattedData, MarketChartResponseData } from '@/shared/types/api/marketChart';


/**
 * PriceMiniChart 전용 1D 가격 시계열 패치.
 * - MarketChart와 캐시를 공유하지 않도록 별도 queryKey 사용
 * - 15분 캐싱 정책
 */
async function fetchPriceMiniChart(): Promise<MarketChartFormattedData> {

  try {
    const searchParams = new URLSearchParams({ vs_currency: 'usd', days: '1' });
    const data: MarketChartResponseData = await fetcher(`${MARKET_CHART_API_URL}?${searchParams.toString()}`);

    if (isDev) {
      console.log('✅ 가격 미니차트 데이터 초기화!');
    }

    return {
      date: data.prices.map((price) => price[0]),
      price: data.prices.map((price) => Math.floor(price[1])),
    };
  } catch {
    return { date: [], price: [] };
  }
}


const MARKET_CHART_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const REFRESH_TIME = 1000 * 60 * 15; // 15분

const usePriceMiniChartData = () => {

  // region [Hooks]

  const { data: priceMiniChartData, isPending, isSuccess, isError, error } = useQuery<MarketChartFormattedData>({
    queryKey: ['priceMiniChart'],
    queryFn: fetchPriceMiniChart,

    staleTime: REFRESH_TIME,
    gcTime: REFRESH_TIME,

    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    refetchInterval: REFRESH_TIME,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    if (isError) {
      console.error('❌ 가격 미니차트 데이터 초기화 오류', error);
      kToast.error('가격 미니차트 데이터 초기화 오류');
    }
  }, [isError]);

  // endregion

  return { priceMiniChartData, isLoading: isPending, isSuccess, isError, error };
};

export default usePriceMiniChartData;
