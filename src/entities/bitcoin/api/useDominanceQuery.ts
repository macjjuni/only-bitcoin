import { useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import fetcher from "@/shared/utils/fetcher";
import { floorToDecimal } from "@/shared/utils/number";
import type { CoinGeckoGlobalResponse } from "../model/types";

const BTC_DOMINANCE_API_URL = "https://api.coingecko.com/api/v3/global";

const fetchBitcoinDominance = async (): Promise<number> => {
  try {
    const { data } = await fetcher<CoinGeckoGlobalResponse>(BTC_DOMINANCE_API_URL);

    if (isDev) {
      console.log("✅ 도미넌스 데이터 초기화!");
    }
    return floorToDecimal(data.market_cap_percentage.btc, 2);
  } catch {
    throw Error("❌ 도미넌스 데이터 초기화 실패!");
  }
};

/** @param initialDominance SSR 초기 도미넌스. 첫 렌더 표시값이자 크롤러용 값임. */
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
    // 서버 캐시 10분이므로 즉시 stale 처리함. 마운트 직후 재조회됨.
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
