import { describe, expect, it } from "vitest";
import {
  fromLogSpace,
  resolveKrwAxisMax,
  resolveLogAxisRange,
  resolveYearLabels,
  shouldUseLogScale,
  toLogSpace,
} from "./createApartmentChartOptions";

const EOK = 100_000_000;

describe("shouldUseLogScale", () => {
  it("값 범위가 50배 미만이면 선형 축을 쓴다", () => {
    expect(shouldUseLogScale([100, 250, 400])).toBe(false);
  });

  it("잠실엘스 84㎡ 처럼 160배 벌어지면 로그 축으로 넘어간다", () => {
    expect(shouldUseLogScale([3367, 480, 21.4])).toBe(true);
  });

  it("거래가 있는 해가 하나뿐이면 비교할 범위가 없어 선형이다", () => {
    expect(shouldUseLogScale([null, 3367, null])).toBe(false);
  });
});

describe("toLogSpace / fromLogSpace", () => {
  it("되돌리면 원래 값이다", () => {
    expect(fromLogSpace(toLogSpace(21.4) as number)).toBeCloseTo(21.4);
    expect(fromLogSpace(toLogSpace(3367) as number)).toBeCloseTo(3367);
  });

  /** 거래가 없는 해는 막대도 점도 그리지 않아야 하므로 0 이 아니라 null 이어야 한다. */
  it("거래 없는 해와 0 이하는 null 로 남는다", () => {
    expect(toLogSpace(null)).toBeNull();
    expect(toLogSpace(0)).toBeNull();
  });
});

describe("resolveLogAxisRange", () => {
  it("10의 거듭제곱 경계로 축을 잡는다", () => {
    // 21.4 ~ 3,367 → 10 ~ 10,000
    expect(resolveLogAxisRange([3367, 480, 21.4])).toEqual({ min: 1, max: 4, tickAmount: 3 });
  });

  it("값이 한 자릿수 안에 몰려 있어도 눈금이 0칸이 되지 않는다", () => {
    expect(resolveLogAxisRange([12, 15])).toEqual({ min: 1, max: 2, tickAmount: 1 });
  });
});

describe("resolveKrwAxisMax", () => {
  it("눈금 수로 나누어떨어지는 값까지만 올린다", () => {
    // 33.2억 / 3칸 → 12억 단위 → 36억
    expect(resolveKrwAxisMax([33.2 * EOK, 8 * EOK], 3)).toBe(36 * EOK);
  });

  it("거래가 하나도 없어도 축이 무너지지 않는다", () => {
    expect(resolveKrwAxisMax([null, null], 4)).toBe(4 * EOK);
  });
});

describe("resolveYearLabels", () => {
  const buildYears = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, index) => start + index);

  /** 마지막 해만 진행 중 ( 실제 응답과 같은 모양 ) */
  const buildPartialFlags = (yearCount: number) =>
    Array.from({ length: yearCount }, (_, index) => index === yearCount - 1);

  /**
   * 화면에 실제로 글자가 보이는 라벨만 남긴다.
   * 자리표시자는 폭 0인 공백( `\u200B` )이라 `trim()` 으로는 안 걸러진다 — 공백 문자가 아니다.
   */
  const visibleOnly = (labels: string[]) => labels.filter((label) => /\d/.test(label));

  it("연도가 8개 이하면 전부 보여준다", () => {
    const years = buildYears(2021, 2026);

    expect(resolveYearLabels(years, buildPartialFlags(years.length))).toEqual([
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
      "2026*",
    ]);
  });

  it("연도가 홀수 개로 많으면 격년만 남긴다", () => {
    const years = buildYears(2014, 2026);
    const labels = resolveYearLabels(years, buildPartialFlags(years.length));

    expect(visibleOnly(labels)).toEqual(["2014", "2016", "2018", "2020", "2022", "2024", "2026*"]);
  });

  /**
   * 인덱스 0부터 세면 짝수 개일 때 마지막이 빠진다.
   * 제일 궁금한 값이 올해라 끝에서부터 세도록 만든 규칙이다.
   */
  it("연도가 짝수 개여도 진행 중인 마지막 해는 반드시 남는다", () => {
    const years = buildYears(2017, 2026);
    const labels = resolveYearLabels(years, buildPartialFlags(years.length));

    expect(labels.at(-1)).toBe("2026*");
    expect(visibleOnly(labels)).toEqual(["2018", "2020", "2022", "2024", "2026*"]);
  });

  /**
   * 빈 라벨이 서로 같으면 ApexCharts 가 데이터포인트를 한 칸으로 합쳐 막대가 사라진다.
   * 라벨은 축 표시이면서 동시에 데이터포인트의 키다.
   */
  it("숨긴 라벨끼리도 서로 다른 문자열이다", () => {
    const years = buildYears(2014, 2026);
    const labels = resolveYearLabels(years, buildPartialFlags(years.length));

    expect(new Set(labels).size).toBe(labels.length);
  });
});
