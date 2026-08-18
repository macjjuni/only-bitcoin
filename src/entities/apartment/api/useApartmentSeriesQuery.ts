"use client";

import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ApartmentYearResponse } from "../lib/buildApartmentYear";
import { CHART_START_YEAR, type LandmarkApartment } from "../model/types";

const MINUTE_IN_MS = 1000 * 60;

/** 확정된 과거 연도는 값이 변하지 않으므로 길게 잡는다. */
const SETTLED_YEAR_STALE_TIME = MINUTE_IN_MS * 60 * 12;

/** 진행 중인 연도는 신고 지연분이 계속 들어오므로 짧게 잡는다. */
const CURRENT_YEAR_STALE_TIME = MINUTE_IN_MS * 30;

async function fetchApartmentYear(
  apartmentID: string,
  year: number,
): Promise<ApartmentYearResponse> {
  const response = await fetch(`/api/apartment/${apartmentID}?year=${year}`);

  if (!response.ok) {
    throw new Error(`아파트 실거래 조회 실패 (${apartmentID}/${year}): ${response.status}`);
  }

  return response.json();
}

/**
 * 차트에 그릴 연도 목록. 최신 연도부터 요청해 막대가 오른쪽부터 채워지게 한다.
 *
 * 사용자가 가장 먼저 확인하는 것은 "지금 몇 BTC 인가" 이므로 최근 연도가 먼저 도착해야 한다.
 */
function buildTargetYears(landmark: LandmarkApartment, currentYear: number): number[] {
  const startYear = Math.max(CHART_START_YEAR, landmark.earliestDealYear);
  const years: number[] = [];

  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push(year);
  }

  return years;
}

export interface ApartmentSeriesResult {
  /** 연도 오름차순으로 정렬된, 도착한 연도들의 응답 */
  yearResponses: ApartmentYearResponse[];
  /** 이 단지가 보유한 평형 버킷 ( 거래가 있는 것만, 오름차순 ) */
  availableAreas: number[];
  isLoading: boolean;
  /** 아직 채워지지 않은 연도가 남았는지 ( 점진 로딩 중 ) */
  isFetchingRemainingYears: boolean;
  isError: boolean;
  /** 일부 월 조회 실패로 불완전한 연도가 섞였는지 */
  hasIncompleteYear: boolean;
}

/**
 * 단지의 연도별 실거래를 **연도 단위로 쪼개어** 조회한다.
 *
 * 공공 API 가 (시군구 × 월) 단위라 한 연도가 12회 외부 호출이다.
 * 13년치를 한 요청에 몰면 첫 응답이 수십 초가 되므로 연도로 나누고,
 * 도착하는 대로 차트에 합쳐 막대를 하나씩 채운다.
 */
export function useApartmentSeriesQuery(
  landmark: LandmarkApartment | undefined,
): ApartmentSeriesResult {
  // region [Hooks]
  const currentYear = new Date().getFullYear();

  const targetYears = useMemo(
    () => (landmark ? buildTargetYears(landmark, currentYear) : []),
    [landmark, currentYear],
  );

  const queryResults = useQueries({
    queries: targetYears.map((year) => ({
      queryKey: ["apartmentYear", landmark?.apartmentID, year],
      queryFn: () => fetchApartmentYear(landmark?.apartmentID ?? "", year),
      enabled: Boolean(landmark),
      /**
       * 불완전한 결과는 신선한 것으로 취급하지 않는다.
       *
       * 이 앱은 쿼리 캐시를 localStorage 에 영속화하고 `refetchOnMount` 가 꺼져 있어,
       * 일시적인 공공 API 초당 제한으로 일부 월이 빠진 응답이 한 번 들어오면
       * 그대로 최대 12시간 동안 화면에 남는다. 서버는 실패한 달을 캐시하지 않으므로
       * 다시 요청하면 채워진다 — `staleTime: 0` 으로 즉시 재조회 대상이 되게 한다.
       */
      staleTime: (query: { state: { data?: ApartmentYearResponse } }) => {
        if (query.state.data?.isIncomplete) {
          return 0;
        }

        return year >= currentYear ? CURRENT_YEAR_STALE_TIME : SETTLED_YEAR_STALE_TIME;
      },
      gcTime: SETTLED_YEAR_STALE_TIME,
      // 전역 기본값이 false 라 위의 `staleTime: 0` 이 재조회로 이어지지 않는다.
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });
  // endregion

  // region [Privates]
  const yearResponses = useMemo(() => {
    return queryResults
      .map((result) => result.data)
      .filter((data): data is ApartmentYearResponse => data !== undefined)
      .sort((left, right) => left.year - right.year);
  }, [queryResults]);

  const availableAreas = useMemo(() => {
    const areas = new Set<number>();

    for (const yearResponse of yearResponses) {
      for (const bucket of yearResponse.areaBuckets) {
        areas.add(bucket.areaInSquareMeter);
      }
    }

    return [...areas].sort((left, right) => left - right);
  }, [yearResponses]);
  // endregion

  return {
    yearResponses,
    availableAreas,
    // 첫 막대가 하나라도 그려지기 전까지만 로딩으로 본다.
    isLoading: yearResponses.length === 0 && queryResults.some((result) => result.isPending),
    isFetchingRemainingYears: queryResults.some((result) => result.isPending),
    isError: queryResults.length > 0 && queryResults.every((result) => result.isError),
    hasIncompleteYear: yearResponses.some((yearResponse) => yearResponse.isIncomplete),
  };
}
