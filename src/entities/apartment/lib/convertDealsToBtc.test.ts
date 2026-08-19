import { describe, expect, it } from "vitest";
import type { ApartmentTrade } from "../model/types";
import { convertTradesToBtcMedian, findBtcPriceOnDate } from "./convertDealsToBtc";

const makeTrade = (overrides: Partial<ApartmentTrade> = {}): ApartmentTrade => ({
  aptName: "래미안원베일리",
  legalDongName: "반포동",
  jibun: "1",
  exclusiveAreaInSquareMeter: 84.98,
  priceInKrw: 5_600_000_000,
  dealDate: "2025-05-31",
  dealYear: 2025,
  floor: 17,
  dealingType: "중개거래",
  ...overrides,
});

describe("findBtcPriceOnDate", () => {
  it("정확히 그 날짜의 시세를 찾는다", () => {
    const map = new Map([["2025-05-31", 146_000_000]]);

    expect(findBtcPriceOnDate(map, "2025-05-31")).toBe(146_000_000);
  });

  it("해당 날짜가 없으면 이전 날짜로 거슬러 올라간다", () => {
    const map = new Map([["2025-05-28", 145_000_000]]);

    expect(findBtcPriceOnDate(map, "2025-05-31")).toBe(145_000_000);
  });

  it("10일을 넘겨 거슬러 올라가지는 않는다", () => {
    const map = new Map([["2025-05-01", 140_000_000]]);

    expect(findBtcPriceOnDate(map, "2025-05-31")).toBeNull();
  });

  it("이후 날짜는 참조하지 않는다 — 미래 시세로 과거를 환산하면 안 된다", () => {
    const map = new Map([["2025-06-05", 150_000_000]]);

    expect(findBtcPriceOnDate(map, "2025-05-31")).toBeNull();
  });

  it("월 경계를 넘어서도 거슬러 올라간다", () => {
    const map = new Map([["2025-04-29", 126_000_000]]);

    expect(findBtcPriceOnDate(map, "2025-05-02")).toBe(126_000_000);
  });

  it("잘못된 날짜 문자열은 null을 돌려준다", () => {
    expect(findBtcPriceOnDate(new Map(), "not-a-date")).toBeNull();
  });

  it("0 이하의 시세는 결측으로 본다", () => {
    const map = new Map([
      ["2025-05-31", 0],
      ["2025-05-30", 146_000_000],
    ]);

    expect(findBtcPriceOnDate(map, "2025-05-31")).toBe(146_000_000);
  });
});

describe("convertTradesToBtcMedian", () => {
  it("거래별로 그 날 시세를 적용한 뒤 중앙값을 낸다", () => {
    const trades = [
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-01-10" }),
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-07-10" }),
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-10-10" }),
    ];
    const btcMap = new Map([
      ["2025-01-10", 150_000_000], // 40 BTC
      ["2025-07-10", 100_000_000], // 60 BTC
      ["2025-10-10", 120_000_000], // 50 BTC
    ]);

    const result = convertTradesToBtcMedian(trades, btcMap);

    expect(result.medianPriceInBtc).toBe(50);
    expect(result.convertedDealCount).toBe(3);
  });

  it("연 대표 시세 하나로 나누는 것과 결과가 다르다 — 거래가 특정 시기에 몰릴 때", () => {
    // 은마 2021 형태: 거래는 BTC가 쌌던 상반기에 몰렸고, 하반기에 BTC가 급등
    const trades = Array.from({ length: 4 }, () =>
      makeTrade({ priceInKrw: 2_400_000_000, dealDate: "2021-03-15" }),
    );
    const btcMap = new Map([["2021-03-15", 60_000_000]]);

    const perDealMedian = convertTradesToBtcMedian(trades, btcMap).medianPriceInBtc as number;

    // 연평균이 하반기 고점을 머금어 높아지면 BTC 개수가 과소평가된다.
    const yearlyAveragePrice = 80_000_000;
    const byYearlyAverage = 2_400_000_000 / yearlyAveragePrice;

    expect(perDealMedian).toBe(40);
    expect(byYearlyAverage).toBe(30);
    expect(byYearlyAverage).toBeLessThan(perDealMedian);
  });

  it("시세를 못 구한 거래만 제외하고 나머지로 집계한다", () => {
    const trades = [
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-01-10" }),
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2014-01-10" }),
    ];
    const btcMap = new Map([["2025-01-10", 100_000_000]]);

    const result = convertTradesToBtcMedian(trades, btcMap);

    expect(result.medianPriceInBtc).toBe(60);
    expect(result.convertedDealCount).toBe(1);
  });

  it("환산 가능한 거래가 없으면 null을 돌려준다", () => {
    const result = convertTradesToBtcMedian([makeTrade()], new Map());

    expect(result.medianPriceInBtc).toBeNull();
    expect(result.convertedDealCount).toBe(0);
  });

  it("거래가 없으면 null을 돌려준다", () => {
    expect(convertTradesToBtcMedian([], new Map()).medianPriceInBtc).toBeNull();
  });

  it("짝수 건이면 가운데 두 값의 평균을 낸다", () => {
    const trades = [
      makeTrade({ priceInKrw: 4_000_000_000, dealDate: "2025-01-10" }),
      makeTrade({ priceInKrw: 6_000_000_000, dealDate: "2025-01-10" }),
    ];
    const btcMap = new Map([["2025-01-10", 100_000_000]]);

    expect(convertTradesToBtcMedian(trades, btcMap).medianPriceInBtc).toBe(50);
  });
});
