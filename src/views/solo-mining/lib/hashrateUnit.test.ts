import { describe, expect, it } from "vitest";
import {
  convertHashrateToHashPerSecond,
  isHashrateUnit,
  isOverMaxHashrate,
} from "./hashrateUnit";

describe("convertHashrateToHashPerSecond", () => {
  it("단위에 맞는 배수를 적용한다", () => {
    expect(convertHashrateToHashPerSecond("78", "KH")).toBe(7.8e4);
    expect(convertHashrateToHashPerSecond("1.2", "TH")).toBe(1.2e12);
    expect(convertHashrateToHashPerSecond("200", "TH")).toBe(2e14);
  });

  it("음수·0·빈 값은 0 을 반환한다", () => {
    expect(convertHashrateToHashPerSecond("", "TH")).toBe(0);
    expect(convertHashrateToHashPerSecond("0", "TH")).toBe(0);
    expect(convertHashrateToHashPerSecond("-5", "TH")).toBe(0);
  });

  it("숫자가 아닌 값과 Infinity 는 0 을 반환한다", () => {
    expect(convertHashrateToHashPerSecond("abc", "TH")).toBe(0);
    expect(convertHashrateToHashPerSecond("Infinity", "TH")).toBe(0);
    expect(convertHashrateToHashPerSecond("NaN", "TH")).toBe(0);
  });

  it("상한을 넘는 값은 0 을 반환해 계산을 막는다", () => {
    expect(convertHashrateToHashPerSecond("1000000", "EH")).toBe(0);
  });
});

describe("isOverMaxHashrate", () => {
  it("상한 초과 여부만 판별한다", () => {
    expect(isOverMaxHashrate("1000000", "EH")).toBe(true);
    expect(isOverMaxHashrate("1.2", "TH")).toBe(false);
    // 입력이 비었거나 잘못된 경우는 초과가 아니다.
    expect(isOverMaxHashrate("", "TH")).toBe(false);
    expect(isOverMaxHashrate("abc", "TH")).toBe(false);
  });
});

describe("isHashrateUnit", () => {
  it("허용된 단위만 통과시킨다", () => {
    expect(isHashrateUnit("TH")).toBe(true);
    expect(isHashrateUnit("EH")).toBe(true);
  });

  it("외부에서 들어온 임의의 값은 거부한다", () => {
    expect(isHashrateUnit("th")).toBe(false);
    expect(isHashrateUnit("__proto__")).toBe(false);
    expect(isHashrateUnit(null)).toBe(false);
    expect(isHashrateUnit(123)).toBe(false);
  });
});
