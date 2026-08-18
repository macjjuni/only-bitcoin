import { describe, expect, it } from "vitest";
import type { ApartmentTrade, LandmarkApartment } from "../model/types";
import {
  calculateMedian,
  filterLandmarkTrades,
  groupTradesByAreaBucket,
  isTradeOfLandmark,
  selectDefaultAreaBucket,
  toAreaBucket,
} from "./aggregateTrades";

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

const makeLandmark = (overrides: Partial<LandmarkApartment> = {}): LandmarkApartment => ({
  apartmentID: "raemian-one-bailey",
  displayName: "래미안원베일리",
  lawdCode: "11650",
  districtName: "서울 서초구",
  legalDongName: "반포동",
  aptNames: ["래미안원베일리"],
  jibunList: ["1"],
  earliestDealYear: 2023,
  defaultAreaInSquareMeter: 84,
  ...overrides,
});

describe("toAreaBucket", () => {
  it("소수점을 버려 정수 ㎡ 버킷으로 묶는다", () => {
    expect(toAreaBucket(84.98)).toBe(84);
    expect(toAreaBucket(59.96)).toBe(59);
  });

  it("국민평형(84.xx)이 84 하나로 모인다 — round 였다면 85로 갈렸을 값들", () => {
    // 마포래미안푸르지오 실제 전용면적. round 면 84 / 85 / 85 / 85 로 쪼개진다.
    const mapoAreas = [84.3884, 84.5978, 84.8919, 84.9603];

    expect(mapoAreas.map(toAreaBucket)).toEqual([84, 84, 84, 84]);
  });

  it("원베일리·헬리오시티의 84.9x 대도 84로 모인다", () => {
    expect([84.93, 84.95, 84.97, 84.98, 84.99].map(toAreaBucket)).toEqual([84, 84, 84, 84, 84]);
  });

  it("85.00 이상은 85 버킷으로 분리된다", () => {
    expect(toAreaBucket(85.0)).toBe(85);
    expect(toAreaBucket(85.4)).toBe(85);
  });
});

describe("calculateMedian", () => {
  it("홀수 개수는 가운데 값을 돌려준다", () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
  });

  it("짝수 개수는 가운데 두 값의 평균을 돌려준다", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("빈 배열은 null을 돌려준다", () => {
    expect(calculateMedian([])).toBeNull();
  });

  it("원본 배열을 변형하지 않는다", () => {
    const values = [3, 1, 2];
    calculateMedian(values);

    expect(values).toEqual([3, 1, 2]);
  });

  it("증여성 저가 직거래가 섞여도 값이 흔들리지 않는다", () => {
    // 신반포2 사례: 중개거래 중앙값 27.5억 대비 직거래가 -46.9%
    const normalDeals = [27.0, 27.5, 28.0, 27.5, 27.2];
    const withDirectDeal = [...normalDeals, 14.6];

    const median = calculateMedian(withDirectDeal) as number;
    const mean = withDirectDeal.reduce((sum, value) => sum + value, 0) / withDirectDeal.length;

    expect(median).toBeCloseTo(27.35, 2);
    // 평균은 2억 넘게 끌려 내려간다.
    expect(mean).toBeLessThan(25.5);
  });
});

describe("isTradeOfLandmark", () => {
  it("단지명과 지번이 모두 맞으면 통과한다", () => {
    expect(isTradeOfLandmark(makeTrade(), makeLandmark())).toBe(true);
  });

  it("부분일치로 유사 단지가 섞이지 않는다", () => {
    const landmark = makeLandmark({
      apartmentID: "banpo-xi",
      aptNames: ["반포자이"],
      jibunList: ["20-43"],
    });

    // 잠원동 '신반포자이'는 '반포자이'를 포함하지만 다른 단지다.
    const otherTrade = makeTrade({ aptName: "신반포자이", jibun: "160" });

    expect(isTradeOfLandmark(otherTrade, landmark)).toBe(false);
  });

  it("아크로리버파크에 아크로리버뷰신반포·방배아크로리버가 섞이지 않는다", () => {
    const landmark = makeLandmark({
      apartmentID: "acro-river-park",
      aptNames: ["아크로리버파크"],
      jibunList: ["2-12"],
    });

    expect(isTradeOfLandmark(makeTrade({ aptName: "아크로리버뷰신반포" }), landmark)).toBe(false);
    expect(isTradeOfLandmark(makeTrade({ aptName: "방배아크로리버" }), landmark)).toBe(false);
    expect(
      isTradeOfLandmark(makeTrade({ aptName: "아크로리버파크", jibun: "2-12" }), landmark),
    ).toBe(true);
  });

  it("단지명이 같아도 지번이 다르면 제외한다", () => {
    expect(isTradeOfLandmark(makeTrade({ jibun: "999" }), makeLandmark())).toBe(false);
  });

  it("여러 표기로 쪼개진 단지를 하나로 묶는다", () => {
    const mapo = makeLandmark({
      apartmentID: "mapo-raemian-prugio",
      aptNames: [
        "마포래미안푸르지오1단지",
        "마포래미안푸르지오2단지",
        "마포래미안푸르지오3단지",
        "마포래미안푸르지오4단지",
      ],
      jibunList: ["777"],
    });

    const trades = [1, 2, 3, 4].map((unit) =>
      makeTrade({ aptName: `마포래미안푸르지오${unit}단지`, jibun: "777" }),
    );

    expect(filterLandmarkTrades(trades, mapo)).toHaveLength(4);
  });

  it("jibunList가 비어 있으면 지번 검증을 건너뛴다", () => {
    const landmark = makeLandmark({ jibunList: [] });

    expect(isTradeOfLandmark(makeTrade({ jibun: "무엇이든" }), landmark)).toBe(true);
  });
});

describe("groupTradesByAreaBucket", () => {
  it("버킷별로 거래를 나눈다", () => {
    const trades = [
      makeTrade({ exclusiveAreaInSquareMeter: 84.98 }),
      makeTrade({ exclusiveAreaInSquareMeter: 84.3884 }),
      makeTrade({ exclusiveAreaInSquareMeter: 59.96 }),
    ];

    const grouped = groupTradesByAreaBucket(trades);

    expect(grouped.get(84)).toHaveLength(2);
    expect(grouped.get(59)).toHaveLength(1);
  });
});

describe("selectDefaultAreaBucket", () => {
  const makeTrades = (bucketCounts: Record<number, number>) =>
    Object.entries(bucketCounts).flatMap(([area, count]) =>
      Array.from({ length: count }, () =>
        makeTrade({ exclusiveAreaInSquareMeter: Number(area) + 0.9 }),
      ),
    );

  it("84 비중이 충분하면 84를 고른다", () => {
    // 헬리오시티: 84가 205/366 = 56%
    expect(selectDefaultAreaBucket(makeTrades({ 39: 49, 59: 34, 84: 205, 110: 38 }))).toBe(84);
  });

  it("84가 최다가 아니어도 비중이 10% 이상이면 84를 고른다", () => {
    // 은마: 76이 42건으로 더 많지만 84가 29/71 = 41%
    expect(selectDefaultAreaBucket(makeTrades({ 76: 42, 84: 29 }))).toBe(84);
  });

  it("84 비중이 10% 미만이면 거래 최다 버킷을 고른다", () => {
    // 타워팰리스1: 84가 1/26 = 3.8% 라 164㎡(7건)가 기본값이 되어야 한다
    const bucket = selectDefaultAreaBucket(
      makeTrades({ 78: 1, 84: 1, 120: 2, 121: 1, 137: 6, 164: 7, 174: 3, 222: 1, 244: 4 }),
    );

    expect(bucket).toBe(164);
  });

  it("84 버킷이 아예 없으면 거래 최다 버킷을 고른다", () => {
    // 압구정 현대6차: 144 / 157 / 196 만 존재
    expect(selectDefaultAreaBucket(makeTrades({ 144: 20, 157: 6, 196: 6 }))).toBe(144);
  });

  it("거래가 없으면 null을 돌려준다", () => {
    expect(selectDefaultAreaBucket([])).toBeNull();
  });
});
