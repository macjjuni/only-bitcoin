import { useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import fetcher from "@/shared/utils/fetcher";
import type { FearGreedIndexResponseTypes } from "../model/types";

const FEAR_GREED_INDEX_API_URL = "https://api.alternative.me/fng/";

const fetchFearGreedIndex = async (): Promise<number> => {
  try {
    const data = await fetcher<FearGreedIndexResponseTypes>(FEAR_GREED_INDEX_API_URL);

    if (isDev) {
      console.log("✅ 공포 탐욕 지수 데이터 초기화!");
    }
    return Number(data.data[0].value);
  } catch {
    throw Error("❌ 공포 탐욕 지수 데이터 초기화 실패!");
  }
};

/**
 * @param initialFearGreedIndex SSR 로 미리 조회한 공포탐욕지수. 크롤러가 읽는 값이다.
 */
const useFearGreedIndex = (initialFearGreedIndex = 0) => {
  // region [Hooks]
  const STALE_TIME_MIN = 10;
  const REFETCH_TIME_MIN = 10;

  const {
    data: fearGreed,
    isError,
    error,
  } = useQuery({
    queryKey: ["fear-greed-index"],
    queryFn: fetchFearGreedIndex,
    staleTime: 1000 * 60 * STALE_TIME_MIN, // 10분 캐싱
    refetchInterval: 1000 * 60 * REFETCH_TIME_MIN, // 10분마다 자동 갱신
    refetchOnMount: true,
    retry: 3,
    initialData: initialFearGreedIndex || undefined,
    // 서버 값은 최대 12시간 캐시된 값이므로 즉시 stale 로 두어 마운트 직후 재조회시킨다.
    initialDataUpdatedAt: 0,
  });
  // endregion

  // region [Life Cycles]

  useEffect(() => {
    if (isError && isDev) {
      kToast.error("공포 탐욕지수 데이터 업데이트 에러!");
      console.log("❌ 공포 탐욕지수 데이터 업데이트 에러!", error);
    }
  }, [isError]);

  // endregion

  return isError ? 0 : fearGreed || 0;
};

export default useFearGreedIndex;
