import { describe, expect, it } from "vitest";
import type { ApartmentTrade, LandmarkApartment } from "../model/types";
import { buildApartmentYear } from "./buildApartmentYear";

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

const build = (districtTrades: ApartmentTrade[], btcDailyKrwMap = new Map<string, number>()) =>
  buildApartmentYear({
    landmark,
    year: 2025,
    districtTrades,
    btcDailyKrwMap,
    settledThroughMonth: 12,
    isPartialYear: false,
    isIncomplete: false,
  });

describe("buildApartmentYear", () => {
  it("같은 구의 다른 단지를 걸러낸다", () => {
    const result = build([
      makeTrade(),
      makeTrade({ aptName: "반포자이", jibun: "20-43" }),
      makeTrade({ aptName: "래미안퍼스티지", jibun: "18-1" }),
    ]);

    expect(result.areaBuckets).toHaveLength(1);
    expect(result.areaBuckets[0].dealCount).toBe(1);
  });

  it("평형 버킷을 면적 오름차순으로 정렬한다", () => {
    const result = build([
      makeTrade({ exclusiveAreaInSquareMeter: 133.9 }),
      makeTrade({ exclusiveAreaInSquareMeter: 59.9 }),
      makeTrade({ exclusiveAreaInSquareMeter: 84.98 }),
    ]);

    expect(result.areaBuckets.map((bucket) => bucket.areaInSquareMeter)).toEqual([59, 84, 133]);
  });

  it("KRW 중앙값과 BTC 중앙값을 함께 낸다", () => {
    const trades = [
      makeTrade({ priceInKrw: 5_000_000_000, dealDate: "2025-01-10" }),
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-07-10" }),
      makeTrade({ priceInKrw: 7_000_000_000, dealDate: "2025-10-10" }),
    ];
    const btcMap = new Map([
      ["2025-01-10", 100_000_000], // 50 BTC
      ["2025-07-10", 100_000_000], // 60 BTC
      ["2025-10-10", 100_000_000], // 70 BTC
    ]);

    const [bucket] = build(trades, btcMap).areaBuckets;

    expect(bucket.medianPriceInKrw).toBe(6_000_000_000);
    expect(bucket.medianPriceInBtc).toBe(60);
    expect(bucket.btcConvertedDealCount).toBe(3);
  });

  it("BTC 시세가 전혀 없어도 KRW 집계는 그대로 나온다", () => {
    const [bucket] = build([makeTrade()]).areaBuckets;

    expect(bucket.medianPriceInKrw).toBe(6_000_000_000);
    expect(bucket.medianPriceInBtc).toBeNull();
    expect(bucket.dealCount).toBe(1);
    expect(bucket.btcConvertedDealCount).toBe(0);
  });

  it("시세 결측 거래는 BTC 집계에서만 빠진다", () => {
    const trades = [
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-01-10" }),
      makeTrade({ priceInKrw: 8_000_000_000, dealDate: "2025-07-10" }),
    ];
    const btcMap = new Map([["2025-01-10", 100_000_000]]);

    const [bucket] = build(trades, btcMap).areaBuckets;

    expect(bucket.dealCount).toBe(2);
    expect(bucket.btcConvertedDealCount).toBe(1);
    expect(bucket.medianPriceInBtc).toBe(60);
  });

  it("거래가 없어도 기본 평형은 화이트리스트 값으로 고정된다", () => {
    const result = build([]);

    expect(result.areaBuckets).toEqual([]);
    expect(result.defaultAreaInSquareMeter).toBe(84);
  });

  it("기본 평형은 연도별 거래와 무관하게 화이트리스트 값을 따른다", () => {
    // 84 거래가 하나도 없는 해에도 기본 평형이 흔들리지 않아야 한다.
    const result = build([makeTrade({ exclusiveAreaInSquareMeter: 164.9 })]);

    expect(result.defaultAreaInSquareMeter).toBe(84);
  });

  it("일부 월 조회 실패를 응답에 그대로 드러낸다", () => {
    const result = buildApartmentYear({
      landmark,
      year: 2025,
      districtTrades: [makeTrade()],
      btcDailyKrwMap: new Map(),
      settledThroughMonth: 12,
      isPartialYear: false,
      isIncomplete: true,
    });

    expect(result.isIncomplete).toBe(true);
  });

  it("원시 거래 목록을 응답에 담지 않는다", () => {
    const result = build([makeTrade()]);

    expect(Object.keys(result)).toEqual([
      "apartmentID",
      "displayName",
      "year",
      "isPartialYear",
      "settledThroughMonth",
      "defaultAreaInSquareMeter",
      "isIncomplete",
      "areaBuckets",
    ]);
  });

  it("진행 중인 연도 정보를 그대로 전달한다", () => {
    const result = buildApartmentYear({
      landmark,
      year: 2026,
      districtTrades: [makeTrade({ dealYear: 2026 })],
      btcDailyKrwMap: new Map(),
      settledThroughMonth: 8,
      isPartialYear: true,
      isIncomplete: false,
    });

    expect(result.isPartialYear).toBe(true);
    expect(result.settledThroughMonth).toBe(8);
  });
});
