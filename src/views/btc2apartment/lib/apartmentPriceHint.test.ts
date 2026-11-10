import { describe, expect, it } from "vitest";
import type { ApartmentYearPoint } from "@/entities/apartment";
import { resolveLatestPriceHint } from "./apartmentPriceHint";

const createYearPoint = (
  year: number,
  buckets: Array<[areaInSquareMeter: number, medianPriceInKrw: number | null]>,
): ApartmentYearPoint =>
  ({
    year,
    isPartialYear: false,
    areaBuckets: buckets.map(([areaInSquareMeter, medianPriceInKrw]) => ({
      areaInSquareMeter,
      medianPriceInKrw,
      medianPriceInBtc: null,
      dealCount: 1,
      btcConvertedDealCount: 0,
    })),
  }) as ApartmentYearPoint;

describe("resolveLatestPriceHint", () => {
  it("그 평형에 거래가 있는 가장 최근 해를 고른다", () => {
    const yearPoints = [
      createYearPoint(2023, [[84, 300]]),
      createYearPoint(2025, [[59, 200]]),
      createYearPoint(2024, [[84, 400]]),
    ];

    expect(resolveLatestPriceHint(yearPoints, 84)).toEqual({
      areaInSquareMeter: 84,
      year: 2024,
      priceInKrw: 400,
    });
  });

  it("가격이 비어 있는 해는 건너뛴다", () => {
    const yearPoints = [createYearPoint(2024, [[84, 400]]), createYearPoint(2025, [[84, null]])];

    expect(resolveLatestPriceHint(yearPoints, 84)?.year).toBe(2024);
  });

  it("그 평형 거래가 한 번도 없으면 null", () => {
    expect(resolveLatestPriceHint([createYearPoint(2025, [[59, 200]])], 84)).toBeNull();
    expect(resolveLatestPriceHint([], 84)).toBeNull();
  });
});
