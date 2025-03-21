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
    return "Error";
  }
};


const useFearGreedIndex = () => {


  // region [Hooks]

  const { data: fearGreed, isSuccess, isError, error } = useQuery({
    queryKey: ["fear-greed-index"],
    queryFn: fetchFearGreedIndex,
    staleTime: 1000 * 60 * 10, // 10분 캐싱
    refetchInterval: 1000 * 60 * 10, // 10분마다 자동 갱신
    placeholderData: 0
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


  return { fearGreed, isSuccess, isError, error };
};


export default useFearGreedIndex;
