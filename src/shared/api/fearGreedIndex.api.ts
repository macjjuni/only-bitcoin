import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useEffect } from "react";
import fetcher from "@/shared/utils/fetcher";
import { FearGreedIndexResponseTypes } from "@/shared/types/api/fearGreedIndex";
import { isDev } from "@/shared/utils/common";


const FEAR_GREED_INDEX_API_URL = "https://api.alternative.me/fng/";


const fetchFearGreedIndex = async (): Promise<number | 'Error'> => {

  try {

    const data = await fetcher<FearGreedIndexResponseTypes>(FEAR_GREED_INDEX_API_URL);

    if (isDev) { console.log("✅ 공포 탐욕 지수 데이터 초기화!"); }
    return Number(data.data[0].value);

  } catch {
    throw Error("❌ 공포 탐욕 지수 데이터 초기화 실패!")
  }
};

const useFearGreedIndex = () => {


  // region [Hooks]

  const STALE_TIME_MIN = 10;
  const REFETCH_TIME_MIN = 10;

  const { data: fearGreed, isLoading, isError, error } = useQuery({
    queryKey: ["fear-greed-index"],
    queryFn: fetchFearGreedIndex,
    staleTime: 1000 * 60 * STALE_TIME_MIN, // 10분 캐싱
    refetchInterval: 1000 * 60 * REFETCH_TIME_MIN, // 10분마다 자동 갱신
    refetchOnMount: true,
    retry: 3
  });

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    if (isError && isDev) {
      toast.error("공포 탐욕지수 데이터 업데이트 에러!");
      console.log("❌ 공포 탐욕지수 데이터 업데이트 에러!", error);
    }
  }, [isError]);

  // endregion

  const value = isError ? "Error" : (fearGreed || 'Error');
  return isLoading ? "Loading.." : value;
};


export default useFearGreedIndex;
