"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoinMarketSnapshot } from "../model/types";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// region [Transactions]
const fetchCoinMarket = async (signal: AbortSignal): Promise<CoinMarketSnapshot> => {
  const response = await fetch("/api/coin-market", { signal });
  if (!response.ok) {
    throw new Error(`히트맵 조회 실패: ${response.status}`);
  }

  const snapshot: CoinMarketSnapshot = await response.json();
  if (snapshot.hasFetchFailed) {
    throw new Error("히트맵 데이터를 불러오지 못했습니다.");
  }

  return snapshot;
};
// endregion

/** 백그라운드에서는 폴링을 멈추고, 재조회 실패 시 마지막 성공 데이터를 유지함. */
export function useCoinMarketQuery() {
  // region [Hooks]
  return useQuery({
    queryKey: ["coinMarketSnapshot"],
    queryFn: ({ signal }) => fetchCoinMarket(signal),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  // endregion
}
