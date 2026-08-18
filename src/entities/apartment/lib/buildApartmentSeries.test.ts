import { describe, expect, it } from "vitest";
import type { ApartmentTrade, LandmarkApartment } from "../model/types";
import { buildApartmentSeries } from "./buildApartmentSeries";
import type { BtcDailyKrwMap } from "./convertDealsToBtc";

const landmark: LandmarkApartment = {
  apartmentID: "raemian-one-bailey",
  displayName: "래미안원베일리",
  lawdCode: "11650",
  districtName: "서울 서초구",
  legalDongName: "반포동",
  aptNames: ["래미안원베일리"],
  jibunList: ["1"],
  earliestDealYear: 2023,
  defaultAreaInSquareMeter: 84,
};

const makeTrade = (overrides: Partial<ApartmentTrade> = {}): ApartmentTrade => ({
  aptName: "래미안원베일리",
  legalDongName: "반포동",
  jibun: "1",
  exclusiveAreaInSquareMeter: 84.98,
  priceInKrw: 6_000_000_000,
  dealDate: "2025-05-31",
  dealYear: 2025,
  floor: 17,
  dealingType: "중개거래",
  ...overrides,
});

const YEARS = [
  { year: 2024, settledThroughMonth: 12, isPartialYear: false },
  { year: 2025, settledThroughMonth: 12, isPartialYear: false },
  { year: 2026, settledThroughMonth: 8, isPartialYear: true },
];

const build = (
  districtTrades: ApartmentTrade[],
  btcByYear: Array<[number, BtcDailyKrwMap]> = [],
  isIncomplete = false,
) =>
  buildApartmentSeries({
    landmark,
    districtTrades,
    years: YEARS,
    btcDailyKrwMapByYear: new Map(btcByYear),
    isIncomplete,
  });

describe("buildApartmentSeries", () => {
  it("거래를 연도별로 나눈다", () => {
    const result = build([
      makeTrade({ dealYear: 2024, dealDate: "2024-03-01" }),
      makeTrade({ dealYear: 2025, dealDate: "2025-03-01" }),
      makeTrade({ dealYear: 2025, dealDate: "2025-09-01" }),
    ]);

    expect(result.years.map((point) => point.areaBuckets[0]?.dealCount ?? 0)).toEqual([1, 2, 0]);
  });

  it("요청한 연도는 거래가 없어도 빠짐없이 돌려준다", () => {
    const result = build([]);

    expect(result.years.map((point) => point.year)).toEqual([2024, 2025, 2026]);
    expect(result.years.every((point) => point.areaBuckets.length === 0)).toBe(true);
  });

  it("같은 구의 다른 단지를 걸러낸다", () => {
    const result = build([
      makeTrade(),
      makeTrade({ aptName: "반포자이", jibun: "20-43" }),
      makeTrade({ aptName: "신반포자이", jibun: "160" }),
    ]);

    expect(result.years[1].areaBuckets[0].dealCount).toBe(1);
  });

  it("연도마다 그 해의 BTC 시세로 환산한다", () => {
    const result = build(
      [
        makeTrade({ dealYear: 2024, dealDate: "2024-03-01", priceInKrw: 6_000_000_000 }),
        makeTrade({ dealYear: 2025, dealDate: "2025-03-01", priceInKrw: 6_000_000_000 }),
      ],
      [
        [2024, new Map([["2024-03-01", 60_000_000]])],
        [2025, new Map([["2025-03-01", 150_000_000]])],
      ],
    );

    // 같은 원화 금액이라도 그 해 시세가 다르면 BTC 개수가 달라진다.
    expect(result.years[0].areaBuckets[0].medianPriceInBtc).toBe(100);
    expect(result.years[1].areaBuckets[0].medianPriceInBtc).toBe(40);
  });

  it("BTC 시세가 없는 연도는 KRW 만 채운다", () => {
    const [bucket] = build([makeTrade()]).years[1].areaBuckets;

    expect(bucket.medianPriceInKrw).toBe(6_000_000_000);
    expect(bucket.medianPriceInBtc).toBeNull();
  });

  it("전 기간에 등장한 평형을 오름차순으로 모은다", () => {
    const result = build([
      makeTrade({ dealYear: 2024, exclusiveAreaInSquareMeter: 133.9 }),
      makeTrade({ dealYear: 2025, exclusiveAreaInSquareMeter: 59.9 }),
      makeTrade({ dealYear: 2025, exclusiveAreaInSquareMeter: 84.98 }),
    ]);

    expect(result.availableAreas).toEqual([59, 84, 133]);
  });

  it("기본 평형은 화이트리스트 값으로 고정된다", () => {
    // 84 거래가 하나도 없어도 흔들리지 않아야 한다.
    const result = build([makeTrade({ exclusiveAreaInSquareMeter: 164.9 })]);

    expect(result.defaultAreaInSquareMeter).toBe(84);
  });

  it("진행 중인 연도 정보를 그대로 전달한다", () => {
    const result = build([]);

    expect(result.years[2]).toMatchObject({
      year: 2026,
      isPartialYear: true,
      settledThroughMonth: 8,
    });
  });

  it("일부 월 조회 실패를 숨기지 않는다", () => {
    expect(build([], [], true).isIncomplete).toBe(true);
  });

  it("원시 거래 목록을 응답에 담지 않는다", () => {
    const result = build([makeTrade()]);

    expect(Object.keys(result)).toEqual([
      "apartmentID",
      "displayName",
      "defaultAreaInSquareMeter",
      "availableAreas",
      "isIncomplete",
      "years",
    ]);
  });
});
