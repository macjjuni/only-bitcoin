import { useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { kToast } from 'kku-ui';
import type { MarketChartIntervalType } from '@/shared/stores/store.interface';
import type { MarketChartFormattedData } from '@/shared/types/api/marketChart';
import { fetchBinanceKlines, type BinanceInterval } from '@/shared/utils/api/binance';
import { fetchBlockchainMarketPriceAll } from '@/shared/utils/api/blockchain';
import { isDev } from '@/shared/utils/common';


/**
 * 인터벌별 Binance Klines 파라미터 매핑
 * - 1D: 5분봉 × 288 (24h)
 * - 7D: 1시간봉 × 168 (7일)
 * - 1M: 4시간봉 × 180 (30일)
 * - 1Y: 1일봉 × 365
 * - 5Y: 1주봉 × 260 (≈ 52주 × 5)
 */
const BINANCE_INTERVAL_MAP: Record<Exclude<MarketChartIntervalType, 'all'>, { interval: BinanceInterval; limit: number }> = {
  '1d': { interval: '5m', limit: 288 },
  '7d': { interval: '1h', limit: 168 },
  '1m': { interval: '4h', limit: 180 },
  '1y': { interval: '1d', limit: 365 },
  '5y': { interval: '1w', limit: 260 },
};


async function fetchMarketChart(interval: MarketChartIntervalType): Promise<MarketChartFormattedData> {

  try {
    const data = interval === 'all'
      ? await fetchBlockchainMarketPriceAll()
      : await fetchBinanceKlines(BINANCE_INTERVAL_MAP[interval].interval, BINANCE_INTERVAL_MAP[interval].limit);

    if (isDev) {
      console.log('✅ 마켓 차트 데이터 초기화!');
    }

    return data;
  } catch {
    return { date: [], price: [] };
  }
}


const REFRESH_TIME = 1000 * 60 * 5; // 5분

const useMarketChart = (interval: MarketChartIntervalType) => {

  // region [Hooks]

  const { data: marketChartData, isPending, isSuccess, isError, error } = useQuery<MarketChartFormattedData>({
    queryKey: ['marketChart', interval],
    queryFn: () => fetchMarketChart(interval),

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
      console.error('❌ 마켓 차트 데이터 초기화 오류', error);
      kToast.error('마켓 차트 데이터 초기화 오류');
    }
  }, [isError]);

  // endregion

  return { marketChartData, isLoading: isPending, isSuccess, isError, error };
};

export default useMarketChart;
