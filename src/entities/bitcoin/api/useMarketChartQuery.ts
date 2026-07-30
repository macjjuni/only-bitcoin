import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { kToast } from "kku-ui";
import { useCallback, useEffect } from "react";
import { isDev } from "@/shared/utils/common";
import type { MarketChartFormattedData } from "../model/market";
import type { MarketChartIntervalType } from "../model/types";
import { type BinanceInterval, fetchBinanceKlines } from "./binance";
import { fetchBlockchainMarketPriceAll, sliceRecentYears } from "./blockchain";

/** Blockchain.com 히스토리로 조회하는 10Y 구간 연수 */
const BLOCKCHAIN_HISTORY_YEARS = 10;

/**
 * 인터벌별 Binance Klines 파라미터 매핑 ( BTCUSDT 종가 기준 )
 * - 1D: 5분봉 × 288 (24h)
 * - 7D: 1시간봉 × 168 (7일)
 * - 1M: 4시간봉 × 180 (30일)
 * - 3M: 12시간봉 × 180 (90일)
 * - 6M: 1일봉 × 180
 * - 1Y: 1일봉 × 365
 * - 3Y: 1주봉 × 156 (≈ 52주 × 3)
 * - 5Y: 1주봉 × 260 (≈ 52주 × 5)
 *
 * 10Y · All 은 바이낸스 상장( 2017-08 ) 이전 구간을 포함해야 하므로 이 매핑에서 제외한다.
 */
const BINANCE_INTERVAL_MAP: Record<
  Exclude<MarketChartIntervalType, "all" | "10y">,
  { interval: BinanceInterval; limit: number }
> = {
  "1d": { interval: "5m", limit: 288 },
  "7d": { interval: "1h", limit: 168 },
  "1m": { interval: "4h", limit: 180 },
  "3m": { interval: "12h", limit: 180 },
  "6m": { interval: "1d", limit: 180 },
  "1y": { interval: "1d", limit: 365 },
  "3y": { interval: "1w", limit: 156 },
  "5y": { interval: "1w", limit: 260 },
};

/** Blockchain.com 전체 히스토리를 소스로 쓰는 인터벌 ( 바이낸스 상장 이전 구간 포함 ) */
type BlockchainHistoryInterval = Extract<MarketChartIntervalType, "10y" | "all">;

function isBlockchainHistoryInterval(
  interval: MarketChartIntervalType,
): interval is BlockchainHistoryInterval {
  return interval === "10y" || interval === "all";
}

/**
 * 인터벌별 쿼리 키.
 *
 * 10Y 는 All 과 동일한 전체 히스토리 응답에서 최근 10년만 잘라 쓰므로 캐시를 공유한다.
 * ( 동일 페이로드 중복 요청·중복 영속화를 막고, 10Y ↔ All 전환도 무요청으로 처리된다 )
 */
function getMarketChartQueryKey(interval: MarketChartIntervalType) {
  if (isBlockchainHistoryInterval(interval)) {
    return ["marketChart", "blockchainHistory"];
  }

  return ["marketChart", interval];
}

/**
 * 인터벌에 맞는 시세 소스 선택
 * - 10Y / All: Blockchain.com 일별 히스토리 ( 2009~ )
 * - 그 외: 바이낸스 BTCUSDT 종가
 */
function fetchMarketChartByInterval(
  interval: MarketChartIntervalType,
): Promise<MarketChartFormattedData> {
  if (isBlockchainHistoryInterval(interval)) {
    return fetchBlockchainMarketPriceAll();
  }

  return fetchBinanceKlines(
    BINANCE_INTERVAL_MAP[interval].interval,
    BINANCE_INTERVAL_MAP[interval].limit,
  );
}

async function fetchMarketChart(
  interval: MarketChartIntervalType,
): Promise<MarketChartFormattedData> {
  try {
    const data = await fetchMarketChartByInterval(interval);

    if (isDev) {
      console.log("✅ 마켓 차트 데이터 초기화!");
    }

    return data;
  } catch {
    return { date: [], price: [] };
  }
}

const MINUTE = 1000 * 60;

/**
 * 인터벌별 캐시 갱신 주기
 * - 1D / 7D / 1M: 분·시간봉 기반이라 5분 주기 갱신 의미가 있음
 * - 3M / 6M / 1Y: 12시간봉·1일봉 기반, 30분 주기로 충분
 * - 3Y / 5Y: 주봉 기반, 1시간 주기로 충분
 * - 10Y / All: Blockchain.com 일별 히스토리라 하루 1회 갱신되므로 1시간 주기로 충분
 *
 * 10Y 와 All 은 쿼리 캐시를 공유하므로( `getMarketChartQueryKey` ) 두 값은 항상 동일하게 유지한다.
 */
const REFRESH_TIME_MAP: Record<MarketChartIntervalType, number> = {
  "1d": MINUTE * 5,
  "7d": MINUTE * 5,
  "1m": MINUTE * 5,
  "3m": MINUTE * 30,
  "6m": MINUTE * 30,
  "1y": MINUTE * 30,
  "3y": MINUTE * 60,
  "5y": MINUTE * 60,
  "10y": MINUTE * 60,
  all: MINUTE * 60,
};

const useMarketChart = (interval: MarketChartIntervalType) => {
  // region [Hooks]
  const refreshTime = REFRESH_TIME_MAP[interval];

  /**
   * All 과 공유하는 전체 히스토리 캐시에서 10Y 구간만 잘라낸다.
   * 캐시에는 항상 전체 히스토리가 남으므로 두 인터벌이 서로의 데이터를 덮어쓰지 않는다.
   */
  const selectMarketChartData = useCallback(
    (data: MarketChartFormattedData) => {
      if (interval !== "10y") {
        return data;
      }

      return sliceRecentYears(data, BLOCKCHAIN_HISTORY_YEARS);
    },
    [interval],
  );

  const {
    data: marketChartData,
    isPending,
    isPlaceholderData,
    isSuccess,
    isError,
    error,
  } = useQuery<MarketChartFormattedData>({
    queryKey: getMarketChartQueryKey(interval),
    queryFn: () => fetchMarketChart(interval),
    select: selectMarketChartData,

    staleTime: refreshTime,
    gcTime: refreshTime,

    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    refetchInterval: refreshTime,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  // endregion

  // region [Life Cycles]

  useEffect(() => {
    if (isError) {
      console.error("❌ 마켓 차트 데이터 초기화 오류", error);
      kToast.error("마켓 차트 데이터 초기화 오류");
    }
  }, [isError]);

  // endregion

  return { marketChartData, isLoading: isPending || isPlaceholderData, isSuccess, isError, error };
};

export default useMarketChart;
