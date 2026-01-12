import { useEffect } from "react";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { kToast } from "kku-ui";
import { MarketChartIntervalType } from '@/shared/stores/store.interface';
import fetcher from "@/shared/utils/fetcher";
import { isDev } from "@/shared/utils/common";
import { MarketChartFormattedData, MarketChartResponseData } from "@/shared/types/api/marketChart";


async function fetchMarketChart(days: MarketChartIntervalType): Promise<MarketChartFormattedData> {

  try {
    const searchParams = new URLSearchParams({ vs_currency: 'usd', days: days.toString() });
    const data: MarketChartResponseData = await fetcher(`${MARKET_CHART_API_URL}?${searchParams.toString()}`);

    if (isDev) {
      console.log("✅ 마켓 차트 데이터 초기화!");
    }

    // 데이터 추출 및 가공
    return {
      date: data.prices.map((price) => price[0]),
      price: data.prices.map((price) => Math.floor(price[1])),
    };
  } catch {
    return { date: [], price: [] }
  }
}

const MARKET_CHART_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const REFRESH_TIME = 1000 * 60 * 5; // 5분

const useMarketChart= (days: MarketChartIntervalType) => {

  // region [Hooks]

  const { data: marketChartData, isPending, isSuccess, isError, error} = useQuery<MarketChartFormattedData>({
    queryKey: ['marketChart', String(days)],
    queryFn: () => fetchMarketChart(days),

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
}

export default useMarketChart;
