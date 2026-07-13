import { useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import fetcher from "@/shared/utils/fetcher";
import { calculateBitcoinDominance } from "../lib/dominance";
import type { ICurrency } from "../model/types";

const BTC_DOMINANCE_API_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";

const fetchBitcoinDominance = async (): Promise<number> => {
  try {
    const data: ICurrency[] = await fetcher<ICurrency[]>(BTC_DOMINANCE_API_URL);

    if (isDev) {
      console.log("✅ 도미넌스 데이터 초기화!");
    }
    return calculateBitcoinDominance(data);
  } catch {
    throw Error("❌ 도미넌스 데이터 초기화 실패!");
  }
};

/**
 * @param initialDominance SSR 로 미리 조회한 도미넌스. 첫 렌더의 표시값이자 크롤러가 읽는 값이다.
 */
const useBitcoinDominanceQuery = (initialDominance = 0): number => {
  // region [Hooks]

  const STALE_TIME_MIN = 10;
  const REFETCH_TIME_MIN = 10;

  const {
    data: dominance,
    error,
    isError,
  } = useQuery<number>({
    queryKey: ["bitcoin-dominance"],
    queryFn: fetchBitcoinDominance,
    staleTime: 1000 * 60 * STALE_TIME_MIN, // 10분 동안 데이터 유효
    refetchInterval: 1000 * 60 * REFETCH_TIME_MIN, // 10분마다 갱신
    refetchOnMount: true,
    retry: 3,
    initialData: initialDominance || undefined,
    // 서버 값은 최대 12시간 캐시된 값이므로 즉시 stale 로 두어 마운트 직후 재조회시킨다.
    initialDataUpdatedAt: 0,
  });

  // endregion

  // region [Life Cycles]

  useEffect(() => {
    if (isError && isDev) {
      kToast.error("도미넌스 데이터 업데이트 에러!");
      console.log("❌ 도미넌스 데이터 업데이트 에러!", error);
    }
  }, [isError]);

  // endregion

  return isError ? 0 : dominance || 0;
};

export default useBitcoinDominanceQuery;
