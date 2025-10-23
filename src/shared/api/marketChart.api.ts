import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "react-toastify";
import { MarketChartIntervalType } from '@/shared/stores/store.interface';
import fetcher from "@/shared/utils/fetcher";
import { isDev } from "@/shared/utils/common";
import { MarketChartFormattedData, MarketChartResponseData } from "@/shared/types/api/marketChart";


const MARKET_CHART_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const STALE_TIME_MIN = 5;
const INTERVAL_TIME_MIN = 1;

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

const useMarketChart= (days: MarketChartIntervalType) => {

  // region [Hooks]

  const { data: marketChartData, isSuccess, isError, error} = useQuery<MarketChartFormattedData>({
    queryKey: ['marketChart', days],
    queryFn: () => fetchMarketChart(days),
    staleTime: 60 * 1000 * STALE_TIME_MIN,
    refetchInterval: 60 * 1000 * INTERVAL_TIME_MIN,
    placeholderData: { price: [], date: [] },
    retry: 3,
  });

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    if (isError) {
      console.error('❌ 마켓 차트 데이터 초기화 오류', error);
      toast.error('마켓 차트 데이터 초기화 오류');
    }
  }, [isError]);

  // endregion

  return { marketChartData, isSuccess, isError, error };
}

export default useMarketChart;
