import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from "react-toastify";
import { HashrateChartIntervalType } from '@/shared/stores/store.interface';
import fetcher from "@/shared/utils/fetcher";
import { isDev } from "@/shared/utils/common";
import {HashrateChartFormattedData, HashrateChartResponseData} from '@/shared/types/api/hashrateChart'


function processDataInWorker(data: HashrateChartResponseData): Promise<HashrateChartFormattedData> {

  return new Promise((resolve, reject) => {
    const worker = new Worker('/worker/hashrate.js');

    worker.postMessage(data);

    worker.onmessage = (event: MessageEvent<HashrateChartFormattedData>) => {
      resolve(event.data);
      worker.terminate();
    };

    worker.onerror = (error: ErrorEvent) => {
      console.error("Worker Error:", error);
      reject(error);
      worker.terminate();
    };
  });
}



async function fetchHashrateChart(interval: HashrateChartIntervalType): Promise<HashrateChartFormattedData> {

  try {
    const data: HashrateChartResponseData = await fetcher(MARKET_CHART_API_URL + interval);

    if (isDev) {
      console.log("✅ 해시레이트 차트 데이터 초기화!");
    }

    return await processDataInWorker(data);
  } catch {
    return {
      currentHashrate: 0,
      currentDifficulty: 0,
      hashrates: { value: [], date: [] },
      difficulty: { value: [], date: [] },
    };
  }
}


const MARKET_CHART_API_URL = 'https://mempool.space/api/v1/mining/hashrate/';
const STALE_TIME_MIN = 30;
const INTERVAL_TIME_MIN = 30;

const useHashrateChartData = (days: HashrateChartIntervalType) => {

  // region [Hooks]

  const { data, isSuccess, isLoading, isError, error} = useQuery<HashrateChartFormattedData>({
    queryKey: ['hashrateChart', days],
    queryFn: () => fetchHashrateChart(days),
    staleTime: 60 * 1000 * STALE_TIME_MIN,
    refetchOnMount: true,
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
