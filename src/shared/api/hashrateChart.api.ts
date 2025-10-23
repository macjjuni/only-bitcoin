import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "react-toastify";
import { HashrateChartIntervalType } from '@/shared/stores/store.interface';
import fetcher from "@/shared/utils/fetcher";
import { isDev } from "@/shared/utils/common";
import {HashrateChartFormattedData, HashrateChartResponseData} from '@/shared/types/api/hashrateChart'


const MARKET_CHART_API_URL = 'https://mempool.space/api/v1/mining/hashrate/';
const STALE_TIME_MIN = 5;
const INTERVAL_TIME_MIN = 10;

async function fetchHashrateChart(interval: HashrateChartIntervalType): Promise<HashrateChartFormattedData> {

  try {
    const data: HashrateChartResponseData = await fetcher(MARKET_CHART_API_URL + interval);

    if (isDev) {
      console.log("✅ 해시레이트 차트 데이터 초기화!");
    }

    const hashratesValue: number[] = []
    const hashratesDate: number[] = []
    const difficultyValue: number[] = []
    const difficultyDate: number[] = []

    const { difficulty, hashrates } = data;

    hashrates.forEach(item => {
      hashratesValue.push(item.avgHashrate);
      hashratesDate.push(item.timestamp);
    });

    difficulty.forEach(item => {
      difficultyValue.push(item.difficulty);
      difficultyDate.push(item.time);
    });

    // 데이터 추출 및 가공
    return {
      hashrates: {
        value: hashratesValue,
        date: hashratesDate,
      },
      difficulty: {
        value: difficultyValue,
        date: difficultyDate,
      }
    };
  } catch {
    return {
      hashrates: { value: [], date: [] },
      difficulty: { value: [], date: [] },
    };
  }
}

const useHashrateChartData = (days: HashrateChartIntervalType) => {

  // region [Hooks]

  const { data, isSuccess, isLoading, isError, error} = useQuery<HashrateChartFormattedData>({
    queryKey: ['hashrateChart', days],
    queryFn: () => fetchHashrateChart(days),
    staleTime: 60 * 1000 * STALE_TIME_MIN,
    refetchInterval: 60 * 1000 * INTERVAL_TIME_MIN,
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

  return { data, isLoading, isSuccess, isError, error };
}

export default useHashrateChartData;
