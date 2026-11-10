import type { ApartmentYearPoint } from "@/entities/apartment";

/**
 * 단지 목록에서 "지금 몇 BTC" 를 미리 보여 주려고 쓰는 대표 가격.
 * 확정 연도 아카이브에서 뽑은 값이라 상세 화면의 올해 중앙값과는 다를 수 있음.
 */
export interface ApartmentPriceHint {
  areaInSquareMeter: number;
  year: number;
  priceInKrw: number;
}

/** apartmentID → 대표 가격. 값이 없는 단지는 키가 없음. */
export type ApartmentPriceHints = Record<string, ApartmentPriceHint>;

/** 그 평형에 거래가 있었던 가장 최근 해의 중앙값을 찾음. 없으면 null. */
export const resolveLatestPriceHint = (
  yearPoints: ApartmentYearPoint[],
  areaInSquareMeter: number,
): ApartmentPriceHint | null => {
  const sortedYearPoints = [...yearPoints].sort((firstPoint, secondPoint) => {
    return secondPoint.year - firstPoint.year;
  });

  for (const yearPoint of sortedYearPoints) {
    const bucket = yearPoint.areaBuckets.find((areaBucket) => {
      return areaBucket.areaInSquareMeter === areaInSquareMeter;
    });

    if (bucket?.medianPriceInKrw) {
      return { areaInSquareMeter, year: yearPoint.year, priceInKrw: bucket.medianPriceInKrw };
    }
  }

  return null;
};
