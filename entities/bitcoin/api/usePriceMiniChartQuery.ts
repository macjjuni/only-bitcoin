import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import type { MarketChartFormattedData } from "@/shared/types/api/marketChart";
import { fetchBinanceKlines } from "@/shared/utils/api/binance";
import { isDev } from "@/shared/utils/common";

/**
 * PriceMiniChart 전용 1D 가격 시계열 패치.
 * - MarketChart와 캐시를 공유하지 않도록 별도 queryKey 사용
 * - 15분 캐싱 정책
 */
async function fetchPriceMiniChart(): Promise<MarketChartFormattedData> {
  try {
    const data = await fetchBinanceKlines("5m", 288);

    if (isDev) {
      console.log("✅ 가격 미니차트 데이터 초기화!");
    }

    return data;
  } catch {
    return { date: [], price: [] };
  }
}

const REFRESH_TIME = 1000 * 60 * 15; // 15분

const usePriceMiniChartData = () => {
  // region [Hooks]

  const {
    data: priceMiniChartData,
    isPending,
    isSuccess,
    isError,
    error,
  } = useQuery<MarketChartFormattedData>({
    queryKey: ["priceMiniChart"],
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
      console.error("❌ 가격 미니차트 데이터 초기화 오류", error);
      kToast.error("가격 미니차트 데이터 초기화 오류");
    }
  }, [isError]);

  // endregion

  return { priceMiniChartData, isLoading: isPending, isSuccess, isError, error };
};

export default usePriceMiniChartData;
