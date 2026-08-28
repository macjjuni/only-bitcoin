import { unstable_cache } from "next/cache";
import { type FredM2Observation, normalizeFredM2Observations } from "../lib/normalizeFredM2";
import type { UsM2MonthlyObservation } from "../model/types";

const FRED_SERIES_OBSERVATIONS_URL = "https://api.stlouisfed.org/fred/series/observations";
const US_M2_SERIES_ID = "M2SL";
const REVALIDATE_SECONDS = 60 * 60 * 6;

interface FredM2SeriesResponse {
  observations?: FredM2Observation[];
}

/** FRED에서 계절조정 미국 M2 월간 시계열 전체를 조회한다. */
async function fetchUsM2MonthlyObservations(): Promise<UsM2MonthlyObservation[]> {
  const fredApiKey = process.env.FRED_API_KEY?.trim();

  if (!fredApiKey) {
    console.warn("[fred] FRED_API_KEY가 없어 미국 M2 데이터를 표시하지 않습니다.");

    return [];
  }

  try {
    const searchParams = new URLSearchParams({
      api_key: fredApiKey,
      file_type: "json",
      series_id: US_M2_SERIES_ID,
      sort_order: "asc",
    });
    const response = await fetch(`${FRED_SERIES_OBSERVATIONS_URL}?${searchParams.toString()}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(`[fred] 미국 M2 조회 실패: HTTP ${response.status}`);

      return [];
    }

    const responseBody = (await response.json()) as FredM2SeriesResponse;

    if (!Array.isArray(responseBody.observations)) {
      console.warn("[fred] 미국 M2 응답 형식이 올바르지 않습니다.");

      return [];
    }

    const monthlyObservations = normalizeFredM2Observations(responseBody.observations);

    if (monthlyObservations.length === 0) {
      console.warn("[fred] 미국 M2 관측값이 비어 있습니다.");
    }

    return monthlyObservations;
  } catch (error) {
    console.warn("[fred] 미국 M2 조회 중 예외:", error);

    return [];
  }
}

/** 6시간 서버 캐시를 적용한 미국 M2 월간 시계열 조회 함수. */
export const getUsM2MonthlyObservations = unstable_cache(
  fetchUsM2MonthlyObservations,
  ["fred-us-m2-monthly"],
  {
    revalidate: REVALIDATE_SECONDS,
    tags: ["fred-us-m2-monthly"],
  },
);
