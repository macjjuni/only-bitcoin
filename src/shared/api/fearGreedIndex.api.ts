import { useQuery } from '@tanstack/react-query';
import { toast } from "react-toastify";
import { useEffect } from "react";
import fetcher from "@/shared/utils/fetcher";
import { FearGreedIndexResponseTypes } from "@/shared/types/api/fearGreedIndex";
import { isDev } from "@/shared/utils/common";


const FEAR_GREED_INDEX_API_URL = "https://api.alternative.me/fng/";


// export default async function initializeFearGreedIndex(): Promise<void> {
//
//   const {setFearGreed} = useStore.getState();
//
//   try {
//     const response = await fetch(FEAR_GREED_INDEX_API_URL);
//
//     if (!response.ok) {
//       throw new Error("Network response was not ok");
//     }
//
//     const data: FearGreedIndexResponseTypes = await response.json();
//
//     setFearGreed({ value: Number(data.data[0].value), timestamp: Number(data.data[0].timestamp) });
//   } catch (e) {
//     console.error(e);
//     // toast.error("Fear and Greed Index update Error!");
//   }
// };

const fetchFearGreedIndex = async (): Promise<{ value: number; timestamp: number }> => {

  const data: FearGreedIndexResponseTypes = await fetcher(FEAR_GREED_INDEX_API_URL);

  if (isDev) { console.log("✅ 공포 탐욕 지수 데이터 초기화!"); }

  return { value: Number(data.data[0].value), timestamp: Number(data.data[0].timestamp) };
};


const useFearGreedIndex = () => {


  // region [Hooks]

  const { data, isSuccess, isError, error } = useQuery({
    queryKey: ['fear-greed-index'],
    queryFn: fetchFearGreedIndex,
    staleTime: 1000 * 60 * 10, // 10분 캐싱
    refetchInterval: 1000 * 60 * 10, // 10분마다 자동 갱신
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


  return { fearGreed: isSuccess ? data : { value: 'Error', timestamp: 0 }, isSuccess, isError, error }
};


export default useFearGreedIndex;
