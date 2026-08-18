import { NextResponse } from "next/server";
import { CHART_START_YEAR, findLandmarkApartment } from "@/entities/apartment";
import { buildApartmentYear, fetchDistrictYearlyTrades } from "@/entities/apartment/server";
import { getBtcDailyKrwMap } from "@/entities/bitcoin/server";

/**
 * 단지별 연 단위 실거래 집계.
 *
 * 한 번에 한 연도만 조회한다. 공공 API 가 (시군구 × 월) 단위라 한 연도가 12회 호출인데,
 * 13년치를 한 요청에 몰면 첫 응답이 수십 초가 된다. 연도로 쪼개면 클라이언트가
 * 최신 연도부터 받아 막대를 하나씩 채울 수 있고, 각 연도가 개별 캐시된다.
 *
 * `entities/apartment` 와 `entities/bitcoin` 을 조합하는 지점이다.
 * 동일 레이어끼리는 서로 참조하지 않으므로 조합은 이 라우트가 맡는다.
 */

interface RouteContext {
  params: Promise<{ apartmentId: string }>;
}

function parseYear(rawYear: string | null): number | null {
  if (!rawYear) {
    return null;
  }

  const year = Number.parseInt(rawYear, 10);

  if (Number.isNaN(year)) {
    return null;
  }

  const currentYear = new Date().getUTCFullYear();

  if (year < CHART_START_YEAR || year > currentYear) {
    return null;
  }

  return year;
}

export async function GET(request: Request, context: RouteContext) {
  const { apartmentId } = await context.params;

  /**
   * 화이트리스트에 없는 식별자는 여기서 막는다.
   * 클라이언트가 `LAWD_CD` 를 직접 넘길 수 없으므로, 임의 지역을 긁는 오픈 프록시로
   * 악용될 여지가 없다.
   */
  const landmark = findLandmarkApartment(apartmentId);

  if (!landmark) {
    return NextResponse.json({ error: "UNKNOWN_APARTMENT" }, { status: 404 });
  }

  const year = parseYear(new URL(request.url).searchParams.get("year"));

  if (year === null) {
    return NextResponse.json({ error: "INVALID_YEAR" }, { status: 400 });
  }

  // 첫 실거래 이전 연도는 외부 호출 없이 빈 결과로 끊는다.
  if (year < landmark.earliestDealYear) {
    return NextResponse.json({
      apartmentID: landmark.apartmentID,
      displayName: landmark.displayName,
      year,
      isPartialYear: false,
      settledThroughMonth: 12,
      defaultAreaInSquareMeter: landmark.defaultAreaInSquareMeter,
      isIncomplete: false,
      areaBuckets: [],
    });
  }

  try {
    const [districtResult, btcDailyKrwMap] = await Promise.all([
      fetchDistrictYearlyTrades(landmark.lawdCode, year),
      getBtcDailyKrwMap(year),
    ]);

    return NextResponse.json(
      buildApartmentYear({
        landmark,
        year,
        districtTrades: districtResult.trades,
        btcDailyKrwMap,
        settledThroughMonth: districtResult.settledThroughMonth,
        isPartialYear: districtResult.isPartialYear,
        isIncomplete: districtResult.isIncomplete,
      }),
    );
  } catch (error) {
    console.error("아파트 연간 실거래 집계 오류", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
