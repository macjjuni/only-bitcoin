"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApartmentSeriesResponse } from "../lib/buildApartmentSeries";
import type { LandmarkApartment } from "../model/types";

const MINUTE_IN_MS = 1000 * 60;

/**
 * 진행 중인 연도가 섞여 있으므로 하루보다 짧게 잡는다.
 * 확정 구간은 서버 캐시가 30일 단위로 잡고 있어 클라이언트가 길게 들고 있을 이유가 없다.
 */
const SERIES_STALE_TIME = MINUTE_IN_MS * 30;

const SERIES_GC_TIME = MINUTE_IN_MS * 60 * 12;

async function fetchApartmentSeries(apartmentID: string): Promise<ApartmentSeriesResponse> {
  const response = await fetch(`/api/apartment/${apartmentID}`);

  if (!response.ok) {
    throw new Error(`아파트 실거래 조회 실패 (${apartmentID}): ${response.status}`);
  }

  return response.json();
}

export interface ApartmentSeriesResult {
  series: ApartmentSeriesResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  /** 일부 월 조회 실패로 집계가 불완전한지 */
  hasIncompleteYear: boolean;
}

/**
 * 단지의 전체 연도 실거래를 **한 번의 요청**으로 조회한다.
 *
 * 연도별로 쪼개 13개 요청을 병렬로 보내던 방식에서 바꾼 것이다.
 * 서버리스에서는 요청마다 인스턴스가 분리될 수 있어 공공 API 발사 간격 제한이
 * 요청 간에 공유되지 않고, 결국 초당 제한에 걸린다.
 */
export function useApartmentSeriesQuery(
  landmark: LandmarkApartment | undefined,
): ApartmentSeriesResult {
  // region [Hooks]
  const { data, isPending, isError } = useQuery({
    queryKey: ["apartmentSeries", landmark?.apartmentID],
    queryFn: () => fetchApartmentSeries(landmark?.apartmentID ?? ""),
    enabled: Boolean(landmark),
    /**
     * 불완전한 결과는 신선한 것으로 취급하지 않는다.
     *
     * 이 앱은 쿼리 캐시를 localStorage 에 영속화하고 `refetchOnMount` 가 꺼져 있어,
     * 일시적인 공공 API 초당 제한으로 일부 월이 빠진 응답이 한 번 들어오면
     * 그대로 오래 화면에 남는다. 서버는 실패한 달을 캐시하지 않으므로 다시 요청하면 채워진다.
     */
    staleTime: (query: { state: { data?: ApartmentSeriesResponse } }) =>
      query.state.data?.isIncomplete ? 0 : SERIES_STALE_TIME,
    gcTime: SERIES_GC_TIME,
    // 전역 기본값이 false 라 위의 `staleTime: 0` 이 재조회로 이어지지 않는다.
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  // endregion

  return {
    series: data,
    isLoading: isPending,
    isError,
    hasIncompleteYear: data?.isIncomplete ?? false,
  };
}
