import { useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import fetcher from "@/shared/utils/fetcher";
import { floorToDecimal } from "@/shared/utils/number";
import type { CoinGeckoGlobalResponse } from "../model/types";

const BTC_DOMINANCE_API_URL = "https://api.coingecko.com/api/v3/global";

/** 한 번의 global 응답에서 뽑는 값들. 같은 쿼리를 나눠 쓰므로 요청은 한 번뿐이다. */
export interface BitcoinGlobalStats {
  /** BTC 시가총액 점유율(%). */
  dominance: number;
  /** BTC 시가총액(달러). 전체 시총 × 도미넌스. */
  marketCapUsd: number;
}

const fetchBitcoinGlobalStats = async (): Promise<BitcoinGlobalStats> => {
  try {
    const { data } = await fetcher<CoinGeckoGlobalResponse>(BTC_DOMINANCE_API_URL);
    const dominance = floorToDecimal(data.market_cap_percentage.btc, 2);
    const totalMarketCapUsd = data.total_market_cap?.usd ?? 0;

    if (isDev) {
      console.log("✅ 도미넌스 데이터 초기화!");
    }

    return { dominance, marketCapUsd: (totalMarketCapUsd * dominance) / 100 };
  } catch {
    throw Error("❌ 도미넌스 데이터 초기화 실패!");
  }
};

/**
 * CoinGecko global 한 방. 도미넌스와 시가총액을 같은 캐시에서 나눠 쓴다.
 *
 * @param initialDominance SSR 초기 도미넌스. 첫 렌더 표시값이자 크롤러용 값임.
 *   시가총액은 SSR 로 안 내려와서 조회가 끝나기 전까지 0 이다.
 */
const useBitcoinGlobalStatsQuery = (initialDominance = 0) => {
  const STALE_TIME_MIN = 10;
  const REFETCH_TIME_MIN = 10;

  return useQuery<BitcoinGlobalStats>({
    /**
     * 키를 `bitcoin-dominance` 에서 바꿨음.
     *
     * 이 앱은 react-query 캐시를 localStorage 에 저장한다(`QueryProvider` 의
     * `PersistQueryClientProvider`). 옛 키에는 도미넌스 **숫자**가 저장돼 있어서,
     * 객체를 기대하는 지금 코드가 그걸 복원하면 `data.dominance` 가 undefined 가
     * 되어 화면이 전부 `—` 로 떴다. 저장된 값의 모양을 바꿀 때는 키도 같이 바꿔야 함.
     */
    queryKey: ["bitcoin-global-stats"],
    queryFn: fetchBitcoinGlobalStats,
    staleTime: 1000 * 60 * STALE_TIME_MIN, // 10분 동안 데이터 유효
    refetchInterval: 1000 * 60 * REFETCH_TIME_MIN, // 10분마다 갱신
    refetchOnMount: true,
    retry: 3,
    initialData: initialDominance ? { dominance: initialDominance, marketCapUsd: 0 } : undefined,
    // 서버 캐시 10분이므로 즉시 stale 처리함. 마운트 직후 재조회됨.
    initialDataUpdatedAt: 0,
  });
};

/** 조회에 실패해도 화면은 유지해야 하므로 에러는 토스트로만 알리고 0 을 돌려준다. */
const useGlobalStatsError = (isError: boolean, error: Error | null): void => {
  useEffect(() => {
    if (isError && isDev) {
      kToast.error("도미넌스 데이터 업데이트 에러!");
      console.log("❌ 도미넌스 데이터 업데이트 에러!", error);
    }
  }, [isError]);
};

/** @param initialDominance SSR 초기 도미넌스. 첫 렌더 표시값이자 크롤러용 값임. */
const useBitcoinDominanceQuery = (initialDominance = 0): number => {
  const { data, error, isError } = useBitcoinGlobalStatsQuery(initialDominance);

  useGlobalStatsError(isError, error);

  return isError ? 0 : (data?.dominance ?? 0);
};

/** BTC 시가총액(달러). 도미넌스와 같은 쿼리를 쓰므로 요청이 늘지 않는다. */
export const useBitcoinMarketCapQuery = (): number => {
  const { data, isError } = useBitcoinGlobalStatsQuery();

  return isError ? 0 : (data?.marketCapUsd ?? 0);
};

export default useBitcoinDominanceQuery;
