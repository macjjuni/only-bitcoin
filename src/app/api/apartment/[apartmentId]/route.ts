import { NextResponse } from "next/server";
import { CHART_START_YEAR, findLandmarkApartment } from "@/entities/apartment";
import {
  buildYearPoints,
  composeApartmentSeries,
  fetchDistrictTrades,
  getArchivedYearPoints,
  resolveRuntimeStartYear,
} from "@/entities/apartment/server";
import { type BtcDailyKrwMap, getBtcDailyKrwMap } from "@/entities/bitcoin/server";

/**
 * 단지의 전체 연도 실거래 집계.
 *
 * 연도별로 라우트를 나누지 않는다. 서버리스에서는 요청마다 인스턴스가 분리될 수 있어
 * 공공 API 발사 간격 제한이 요청 간에 공유되지 않는다. 13개 연도를 13개 요청으로 나누면
 * 각자 자기 페이스로 쏘아 초당 제한에 걸린다. 한 요청에서 전부 처리해야 페이싱이 동작한다.
 *
 * `entities/apartment` 와 `entities/bitcoin` 을 조합하는 지점이다.
 * 동일 레이어끼리는 서로 참조하지 않으므로 조합은 이 라우트가 맡는다.
 */

const DAY_IN_SECONDS = 60 * 60 * 24;

/**
 * CDN·브라우저에 내려보낼 캐시 정책.
 *
 * 연 단위 집계라 하루는 묵어도 된다. `stale-while-revalidate` 를 함께 주어
 * 만료 직후 요청도 기존 값을 즉시 받고, 갱신은 뒤에서 돌게 한다.
 *
 * **불완전한 응답은 절대 캐시하지 않는다.** 초당 제한으로 일부 월이 빠진 결과가
 * 엣지에 24시간 박히면, 서버 캐시에서 막아 둔 문제( 13.3 )가 CDN 층에서 되살아난다.
 */
function resolveCacheControl(isIncomplete: boolean): string {
  if (isIncomplete) {
    return "no-store";
  }

  return `public, s-maxage=${DAY_IN_SECONDS}, stale-while-revalidate=${DAY_IN_SECONDS}`;
}

interface RouteContext {
  params: Promise<{ apartmentId: string }>;
}

/** 연도별 BTC 일별 시세를 모아 온다. 실패한 연도는 빈 Map 이라 BTC 환산만 건너뛴다. */
async function collectBtcDailyKrwMaps(
  startYear: number,
  endYear: number,
): Promise<Map<number, BtcDailyKrwMap>> {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  const entries = await Promise.all(
    years.map(async (year) => [year, await getBtcDailyKrwMap(year)] as const),
  );

  return new Map(entries);
}

export async function GET(_request: Request, context: RouteContext) {
  const { apartmentId } = await context.params;

  /**
   * 화이트리스트에 없는 식별자는 여기서 막는다.
   * 클라이언트가 `LAWD_CD` 를 직접 넘길 수 없으므로, 임의 지역을 긁는 오픈 프록시로
   * 악용될 여지가 없다.
   */
  const landmark = findLandmarkApartment(apartmentId);

  if (!landmark) {
    // 오류 응답은 캐시하지 않는다. 화이트리스트가 바뀌면 즉시 반영되어야 한다.
    return NextResponse.json(
      { error: "UNKNOWN_APARTMENT" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  // 첫 실거래 이전 구간은 조회하지 않아 불필요한 외부 호출을 막는다.
  const earliestYear = Math.max(CHART_START_YEAR, landmark.earliestDealYear);
  const currentYear = new Date().getUTCFullYear();

  /**
   * 확정된 과거 연도는 `archive.json` 에서 그대로 가져온다.
   * 런타임 조회는 아카이브 마지막 연도 다음부터라 구당 152회가 8회로 줄어든다.
   */
  const archivedYearPoints = getArchivedYearPoints(landmark.apartmentID);
  const runtimeStartYear = resolveRuntimeStartYear(landmark.apartmentID, earliestYear);

  try {
    const [districtResult, btcDailyKrwMapByYear] = await Promise.all([
      fetchDistrictTrades(landmark.lawdCode, runtimeStartYear),
      collectBtcDailyKrwMaps(runtimeStartYear, currentYear),
    ]);

    const runtimeYearPoints = buildYearPoints({
      landmark,
      districtTrades: districtResult.trades,
      years: districtResult.years,
      btcDailyKrwMapByYear,
    });

    // 겹치는 연도는 런타임 쪽이 이긴다 — 아카이브가 낡았을 수 있다.
    const series = composeApartmentSeries(
      landmark,
      [archivedYearPoints, runtimeYearPoints],
      districtResult.isIncomplete,
    );

    return NextResponse.json(series, {
      headers: { "Cache-Control": resolveCacheControl(series.isIncomplete) },
    });
  } catch (error) {
    console.error("아파트 실거래 집계 오류", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
