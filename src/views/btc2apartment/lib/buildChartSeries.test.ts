import { describe, expect, it } from "vitest";
import type { ApartmentYearPoint } from "@/entities/apartment";
import { shouldUseLogScale } from "../ui/createApartmentChartOptions";
import {
  buildChartSeries,
  formatBtcCount,
  formatKrwInEok,
  resolveSelectedArea,
} from "./buildChartSeries";

const makeYear = (
  year: number,
  buckets: Array<{ area: number; krw: number | null; btc: number | null; count: number }>,
  overrides: Partial<ApartmentYearPoint> = {},
): ApartmentYearPoint => ({
  year,
  isPartialYear: false,
  settledThroughMonth: 12,
  areaBuckets: buckets.map((bucket) => ({
    areaInSquareMeter: bucket.area,
    medianPriceInKrw: bucket.krw,
    medianPriceInBtc: bucket.btc,
    dealCount: bucket.count,
    btcConvertedDealCount: bucket.count,
  })),
  ...overrides,
});

describe("buildChartSeries", () => {
  const years = [
    makeYear(2023, [{ area: 84, krw: 3_920_000_000, btc: 96.8, count: 10 }]),
    makeYear(2024, [{ area: 84, krw: 4_750_000_000, btc: 55.2, count: 26 }]),
    makeYear(2025, [{ area: 84, krw: 5_750_000_000, btc: 40.4, count: 29 }]),
  ];

  it("BTC 단위 시리즈를 만든다", () => {
    const series = buildChartSeries(years, 84, "BTC");

    expect(series.map((point) => point.value)).toEqual([96.8, 55.2, 40.4]);
  });

  it("KRW 단위 시리즈를 만든다", () => {
    const series = buildChartSeries(years, 84, "KRW");

    expect(series.map((point) => point.value)).toEqual([
      3_920_000_000, 4_750_000_000, 5_750_000_000,
    ]);
  });

  it("같은 데이터로 두 단위가 정반대 방향이 된다 — 페이지의 핵심 메시지", () => {
    const btcSeries = buildChartSeries(years, 84, "BTC").map((point) => point.value as number);
    const krwSeries = buildChartSeries(years, 84, "KRW").map((point) => point.value as number);

    expect(krwSeries.at(-1)).toBeGreaterThan(krwSeries[0]);
    expect(btcSeries.at(-1)).toBeLessThan(btcSeries[0]);
  });

  it("거래가 없는 해는 0이 아니라 null로 둔다", () => {
    const series = buildChartSeries(
      [makeYear(2024, [{ area: 59, krw: 1, btc: 1, count: 1 }])],
      84,
      "BTC",
    );

    expect(series[0].value).toBeNull();
    expect(series[0].dealCount).toBe(0);
  });

  it("BTC 시세를 못 구한 해는 BTC 모드에서만 null이고 KRW 모드는 정상이다", () => {
    const yearsWithMissingBtc = [
      makeYear(2024, [{ area: 84, krw: 4_750_000_000, btc: null, count: 26 }]),
    ];

    expect(buildChartSeries(yearsWithMissingBtc, 84, "BTC")[0].value).toBeNull();
    expect(buildChartSeries(yearsWithMissingBtc, 84, "KRW")[0].value).toBe(4_750_000_000);
  });

  it("평형이 정해지지 않았으면 빈 시리즈를 돌려준다", () => {
    expect(buildChartSeries(years, null, "BTC")).toEqual([]);
  });

  it("진행 중인 연도 정보를 각 점에 실어 보낸다", () => {
    const series = buildChartSeries(
      [
        makeYear(2026, [{ area: 84, krw: 1, btc: 1, count: 1 }], {
          isPartialYear: true,
          settledThroughMonth: 8,
        }),
      ],
      84,
      "BTC",
    );

    expect(series[0].isPartialYear).toBe(true);
    expect(series[0].settledThroughMonth).toBe(8);
  });
});

describe("resolveSelectedArea", () => {
  it("사용자가 고른 평형이 존재하면 그대로 쓴다", () => {
    expect(resolveSelectedArea([59, 84, 133], 133, 84)).toBe(133);
  });

  it("고른 평형이 이 단지에 없으면 기본 평형으로 되돌린다", () => {
    // 단지를 막 바꾼 직후 이전 단지의 평형이 남아 있는 상황
    expect(resolveSelectedArea([59, 84, 133], 244, 84)).toBe(84);
  });

  it("선택이 없으면 기본 평형을 쓴다", () => {
    expect(resolveSelectedArea([59, 84], null, 84)).toBe(84);
  });

  it("기본 평형마저 거래가 없으면 가장 작은 평형으로 폴백한다", () => {
    expect(resolveSelectedArea([144, 157, 196], null, 84)).toBe(144);
  });

  it("평형이 하나도 없으면 null을 돌려준다", () => {
    expect(resolveSelectedArea([], null, 84)).toBeNull();
  });
});

describe("formatKrwInEok", () => {
  it("원 단위를 억 단위로 축약한다", () => {
    expect(formatKrwInEok(5_825_000_000)).toBe("58.3");
    expect(formatKrwInEok(2_130_000_000)).toBe("21.3");
  });
});

describe("formatBtcCount", () => {
  it("값이 클수록 소수 자리를 줄여 자릿수를 안정시킨다", () => {
    expect(formatBtcCount(187.9)).toBe("188");
    expect(formatBtcCount(40.37)).toBe("40.4");
    expect(formatBtcCount(4.567)).toBe("4.57");
  });
});

describe("shouldUseLogScale", () => {
  it("값 범위가 50배를 넘으면 로그 축을 쓴다", () => {
    // 잠실엘스 84㎡ 실측: 2015년 약 3,400 BTC → 2026년 21 BTC (약 160배)
    expect(shouldUseLogScale([3400, 1800, 900, 300, 80, 40, 21])).toBe(true);
  });

  it("범위가 좁으면 선형 축을 유지한다", () => {
    // 원베일리 BTC: 96.8 → 40.4 (약 2.4배)
    expect(shouldUseLogScale([96.8, 55.2, 40.4, 50.3])).toBe(false);
  });

  it("KRW 값은 범위가 좁아 선형을 유지한다", () => {
    expect(shouldUseLogScale([1_630_000_000, 3_090_000_000])).toBe(false);
  });

  it("null과 0은 판단에서 제외한다", () => {
    expect(shouldUseLogScale([null, 100, null, 50])).toBe(false);
    expect(shouldUseLogScale([0, 100, 1])).toBe(true);
  });

  it("유효한 값이 2개 미만이면 선형을 유지한다", () => {
    expect(shouldUseLogScale([100])).toBe(false);
    expect(shouldUseLogScale([])).toBe(false);
    expect(shouldUseLogScale([null, null])).toBe(false);
  });
});
