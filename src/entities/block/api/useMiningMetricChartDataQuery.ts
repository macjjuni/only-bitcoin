import { useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import fetcher from "@/shared/utils/fetcher";
import type {
  HashrateChartFormattedData,
  HashrateChartResponseData,
  MiningMetricChartIntervalType,
} from "../model/types";

const MINING_HASHRATE_API_URL = "https://mempool.space/api/v1/mining/hashrate/";
const STALE_TIME_MIN = 30;
const INTERVAL_TIME_MIN = 30;

function processDataInWorker(data: HashrateChartResponseData): Promise<HashrateChartFormattedData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/worker/hashrate-chart.js");

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

/**
 * 실패는 삼키지 않고 던짐. 빈 데이터를 돌려주면 성공으로 잡혀서 재시도도 안 하고
 * 빈 차트가 30분 동안 캐시에 남았음.
 */
async function fetchMiningMetricChart(
  interval: MiningMetricChartIntervalType,
): Promise<HashrateChartFormattedData> {
  const data: HashrateChartResponseData = await fetcher(MINING_HASHRATE_API_URL + interval);

  if (isDev) {
    console.log("✅ 해시레이트 차트 데이터 초기화!");
  }

  return processDataInWorker(data);
}

const useMiningMetricChartData = (days: MiningMetricChartIntervalType) => {
  // region [Hooks]

  const { data, isSuccess, isLoading, isError, error } = useQuery<HashrateChartFormattedData>({
    queryKey: ["hashrateChart", days],
    queryFn: () => fetchMiningMetricChart(days),

    staleTime: 60 * 1000 * STALE_TIME_MIN,
    refetchOnMount: true,
    refetchInterval: 60 * 1000 * INTERVAL_TIME_MIN,

    retry: 3,
  });

  // endregion

  // region [Life Cycles]

  useEffect(() => {
    if (isError) {
      console.error("❌ 채굴 지표 차트 데이터 초기화 오류", error);
      kToast.error("채굴 지표 차트 데이터 초기화 오류");
    }
  }, [isError]);

  // endregion

  return { data, isLoading, isSuccess, isError, error };
};

export default useMiningMetricChartData;
