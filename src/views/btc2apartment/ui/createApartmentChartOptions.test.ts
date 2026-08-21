import { describe, expect, it } from "vitest";
import {
  fromLogSpace,
  resolveKrwAxisMax,
  resolveLogAxisRange,
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
