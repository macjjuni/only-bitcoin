"use client";

import { useMemo } from "react";
import { useMarketChartData } from "@/entities/bitcoin/client";
import { SHARE_CARD_TIMEFRAME_INTERVAL_MAP, type ShareCardTimeframe } from "./shareCardTimeframe";
import { useBtcSurgeShareStore } from "./useBtcSurgeShareStore";

/** 곡선을 그리기 위해 필요한 최소 가격 포인트 개수 */
const MINIMUM_CHART_POINT_COUNT = 10;

/** 곡선 생성에 필요한 최소 포인트 개수 */
const MINIMUM_CURVE_POINT_COUNT = 2;

export interface ShareCardChart {
  timeframe: ShareCardTimeframe;
  /** 바이낸스 BTCUSDT 종가 시계열 ( 달러 기준 ). 유효한 시계열이 없으면 빈 배열. */
  usdPrices: number[];
  isChartDataReady: boolean;
  isChartDataLoading: boolean;
}

/**
 * 선택된 타임프레임의 공유 카드용 시세 시계열.
 *
 * 카드와 다이얼로그가 함께 구독한다. TanStack Query 가 동일 `queryKey` 로 캐시를 공유하므로
 * 두 곳에서 호출해도 네트워크 요청은 한 번만 나간다.
 *
 * `fetchMarketChart` 는 요청 실패를 삼키고 빈 배열을 정상 응답으로 반환하므로 실패해도
 * 로딩이 끝난 것처럼 보인다. 따라서 시계열 유효성은 `isChartDataLoading` 이 아니라
 * `isChartDataReady` 로 판단해야 한다.
 *
 * @param isEnabled `false` 이면 조회하지 않는다. 다이얼로그는 모든 페이지에 상시 마운트되므로
 *                  열려 있지 않을 때까지 구독하면 공유 카드를 쓰지 않는 사용자에게도
 *                  매 페이지 로드마다 요청과 주기 갱신이 발생한다.
 */
export function useShareCardChart(isEnabled = true): ShareCardChart {
  // region [Hooks]
  const timeframe = useBtcSurgeShareStore((state) => state.timeframe);
  const { marketChartData, isLoading } = useMarketChartData(
    SHARE_CARD_TIMEFRAME_INTERVAL_MAP[timeframe],
    isEnabled,
  );

  const usdPrices = useMemo<number[]>(() => {
    if (marketChartData?.price && marketChartData.price.length >= MINIMUM_CHART_POINT_COUNT) {
      return marketChartData.price;
    }
    return [];
  }, [marketChartData]);
  // endregion

  return {
    timeframe,
    usdPrices,
    isChartDataReady: usdPrices.length >= MINIMUM_CURVE_POINT_COUNT,
    isChartDataLoading: isLoading,
  };
}
