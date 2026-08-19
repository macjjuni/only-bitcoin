import { describe, expect, it } from "vitest";
import type { ApartmentYearPoint } from "@/entities/apartment";
import { buildApartmentShareStats, formatBtcCount, formatMultiple } from "./buildShareStats";

const makeYear = (
  year: number,
  buckets: Array<{ area: number; krw: number | null; btc: number | null; count: number }>,
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
});

/** BTC 1개 = 1억원. 현재값 환산을 암산할 수 있게 잡은 값이다. */
const BITCOIN_PRICE_IN_KRW = 100_000_000;

describe("buildApartmentShareStats", () => {
  const years = [
    makeYear(2014, [{ area: 84, krw: 1_000_000_000, btc: 2_000, count: 10 }]),
    makeYear(2026, [{ area: 84, krw: 5_000_000_000, btc: 45, count: 20 }]),
  ];

  const build = (yearPoints = years, bitcoinPriceInKrw = BITCOIN_PRICE_IN_KRW) =>
    buildApartmentShareStats({ yearPoints, areaInSquareMeter: 84, bitcoinPriceInKrw });

  it("같은 기준 연도에서 두 단위를 반대 방향으로 뽑는다", () => {
    const stats = build();

    expect(stats).toMatchObject({
      baseYear: 2014,
      latestYear: 2026,
      // 50억 ÷ 1억 = 50 BTC, 2014년 2,000 BTC 대비 -97.5%
      btc: { baseValue: 2_000, currentValue: 50, changeRate: -97.5 },
      // 같은 기간 원화는 10억 → 50억, +400%
      krw: { baseValue: 1_000_000_000, currentValue: 5_000_000_000, changeRate: 400 },
    });
  });

  it("비트코인 기준으로 몇 배 싸졌는지 계산한다", () => {
    // 2,000 BTC → 50 BTC = 40배
    expect(build()?.btcCheaperMultiple).toBe(40);
  });

  it("표본이 얇은 첫 해는 기준에서 건너뛴다", () => {
    const thinFirstYear = [
      makeYear(2014, [{ area: 84, krw: 900_000_000, btc: 9_999, count: 1 }]),
      makeYear(2016, [{ area: 84, krw: 1_000_000_000, btc: 2_000, count: 5 }]),
      makeYear(2026, [{ area: 84, krw: 5_000_000_000, btc: 45, count: 20 }]),
    ];

    expect(build(thinFirstYear)).toMatchObject({ baseYear: 2016, btc: { baseValue: 2_000 } });
  });

  it("모든 해가 얇으면 가장 이른 해로 물러난다", () => {
    const thinYears = [
      makeYear(2014, [{ area: 84, krw: 1_000_000_000, btc: 2_000, count: 1 }]),
      makeYear(2026, [{ area: 84, krw: 5_000_000_000, btc: 45, count: 2 }]),
    ];

    expect(build(thinYears)?.baseYear).toBe(2014);
  });

  it("한쪽 단위만 있는 해는 쓰지 않는다", () => {
    // 2014 는 BTC 시세가 결측이라 두 단위를 나란히 놓을 수 없다.
    const missingBtc = [
      makeYear(2014, [{ area: 84, krw: 900_000_000, btc: null, count: 10 }]),
      makeYear(2016, [{ area: 84, krw: 1_000_000_000, btc: 2_000, count: 5 }]),
      makeYear(2026, [{ area: 84, krw: 5_000_000_000, btc: 45, count: 20 }]),
    ];

    expect(build(missingBtc)?.baseYear).toBe(2016);
  });

  it("거래 연도가 하나뿐이면 비교하지 않는다", () => {
    expect(
      build([makeYear(2026, [{ area: 84, krw: 5_000_000_000, btc: 45, count: 20 }])]),
    ).toBeNull();
  });

  it("BTC 시세가 아직 없으면 비교하지 않는다", () => {
    expect(build(years, 0)).toBeNull();
  });

  it("평형이 정해지지 않았으면 null", () => {
    expect(
      buildApartmentShareStats({
        yearPoints: years,
        areaInSquareMeter: null,
        bitcoinPriceInKrw: BITCOIN_PRICE_IN_KRW,
      }),
    ).toBeNull();
  });
});

describe("formatBtcCount", () => {
  it("값이 클수록 소수 자리를 줄이고 네 자리부터 콤마를 넣는다", () => {
    expect(formatBtcCount(1_684.3)).toBe("1,684");
    expect(formatBtcCount(187.9)).toBe("188");
    expect(formatBtcCount(40.37)).toBe("40.4");
    expect(formatBtcCount(4.567)).toBe("4.57");
  });
});

describe("formatMultiple", () => {
  it("배수가 세 자리를 넘으면 소수를 버린다", () => {
    expect(formatMultiple(45.67)).toBe("45.7");
    expect(formatMultiple(120.4)).toBe("120");
  });
});
