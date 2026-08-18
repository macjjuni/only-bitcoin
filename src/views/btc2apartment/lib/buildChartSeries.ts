import type { ApartmentYearResponse, PriceUnit } from "@/entities/apartment";

export interface ChartPoint {
  year: number;
  /** 선택 단위의 값. 그 해에 해당 평형 거래가 없으면 null ( 막대를 그리지 않는다 ) */
  value: number | null;
  dealCount: number;
  isPartialYear: boolean;
  settledThroughMonth: number;
}

/**
 * 연도별 응답을 선택한 단위·평형의 시리즈로 바꾼다.
 *
 * 서버가 KRW·BTC 두 값을 모두 내려주므로 여기서는 필드를 고르기만 한다.
 * 덕분에 단위를 토글해도 재요청이 발생하지 않는다.
 */
export function buildChartSeries(
  yearResponses: ApartmentYearResponse[],
  areaInSquareMeter: number | null,
  priceUnit: PriceUnit,
): ChartPoint[] {
  if (areaInSquareMeter === null) {
    return [];
  }

  return yearResponses.map((yearResponse) => {
    const bucket = yearResponse.areaBuckets.find(
      (areaBucket) => areaBucket.areaInSquareMeter === areaInSquareMeter,
    );

    const value =
      priceUnit === "BTC" ? (bucket?.medianPriceInBtc ?? null) : (bucket?.medianPriceInKrw ?? null);

    /**
     * 거래가 없는 해는 0 이 아니라 null 이다.
     * 0 으로 채우면 "그 해에는 공짜였다" 로 읽힌다.
     */
    return {
      year: yearResponse.year,
      value,
      dealCount: bucket?.dealCount ?? 0,
      isPartialYear: yearResponse.isPartialYear,
      settledThroughMonth: yearResponse.settledThroughMonth,
    };
  });
}

/**
 * 표시할 평형을 정한다.
 *
 * 사용자가 고른 평형이 이 단지에 없으면( 단지를 막 바꾼 직후 등 ) 기본 평형으로 되돌린다.
 */
export function resolveSelectedArea(
  availableAreas: number[],
  selectedAreaInSquareMeter: number | null,
  defaultAreaInSquareMeter: number | undefined,
): number | null {
  if (selectedAreaInSquareMeter !== null && availableAreas.includes(selectedAreaInSquareMeter)) {
    return selectedAreaInSquareMeter;
  }

  if (defaultAreaInSquareMeter !== undefined && availableAreas.includes(defaultAreaInSquareMeter)) {
    return defaultAreaInSquareMeter;
  }

  return availableAreas[0] ?? null;
}

/** 억 단위 축약. `5_825_000_000` → `"58.3"` */
export function formatKrwInEok(priceInKrw: number): string {
  return (priceInKrw / 100_000_000).toFixed(1);
}

/** BTC 개수 표기. 값이 클수록 소수 자리를 줄여 자릿수를 안정시킨다. */
export function formatBtcCount(btcCount: number): string {
  if (btcCount >= 100) {
    return btcCount.toFixed(0);
  }

  if (btcCount >= 10) {
    return btcCount.toFixed(1);
  }

  return btcCount.toFixed(2);
}
