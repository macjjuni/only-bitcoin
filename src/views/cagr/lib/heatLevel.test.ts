import { describe, expect, it } from "vitest";
import {
  formatReturnRate,
  HEAT_DOMAIN_PERCENT,
  resolveHeatClassName,
  resolveHeatLevel,
} from "./heatLevel";

describe("resolveHeatLevel", () => {
  it("0 과 결측은 무색이다", () => {
    expect(resolveHeatLevel(0)).toBe(0);
    expect(resolveHeatLevel(null)).toBe(0);
  });

  /** 0.3% 짜리 달이 무색으로 빠지면 데이터 없는 달과 구분이 안 됨. */
  it("아주 작은 값도 최소 한 단계를 받는다", () => {
    expect(resolveHeatLevel(0.01)).toBe(1);
    expect(resolveHeatLevel(-0.01)).toBe(-1);
  });

  it("도메인을 다섯 구간으로 끊는다", () => {
    expect(resolveHeatLevel(8)).toBe(1);
    expect(resolveHeatLevel(8.1)).toBe(2);
    expect(resolveHeatLevel(16)).toBe(2);
    expect(resolveHeatLevel(24)).toBe(3);
    expect(resolveHeatLevel(32)).toBe(4);
    expect(resolveHeatLevel(40)).toBe(5);
  });

  it("도메인을 넘어가면 최대 단계로 뭉친다", () => {
    expect(resolveHeatLevel(HEAT_DOMAIN_PERCENT + 1)).toBe(5);
    expect(resolveHeatLevel(5000)).toBe(5);
    expect(resolveHeatLevel(-5000)).toBe(-5);
  });

  it("부호가 방향을 정한다", () => {
    expect(resolveHeatLevel(20)).toBe(3);
    expect(resolveHeatLevel(-20)).toBe(-3);
  });

  it("유한하지 않은 값은 무색이다", () => {
    expect(resolveHeatLevel(Number.POSITIVE_INFINITY)).toBe(0);
    expect(resolveHeatLevel(Number.NaN)).toBe(0);
  });
});

describe("resolveHeatClassName", () => {
  it("결측은 빗금으로 표시한다", () => {
    expect(resolveHeatClassName(null)).toBe("heat-empty");
  });

  it("0 은 배경을 칠하지 않는다", () => {
    expect(resolveHeatClassName(0)).toBe("");
  });

  /**
   * 이 테스트가 잡는 버그:
   * 클래스를 템플릿 문자열로 조립하면 Tailwind 가 못 수집해 프로덕션에서 색이 사라짐.
   * 리터럴 테이블이 유지되는지를 값으로 고정함.
   */
  it("단계마다 리터럴 클래스를 돌려준다", () => {
    expect(resolveHeatClassName(5)).toBe("bg-up/20");
    expect(resolveHeatClassName(40)).toBe("bg-up");
    expect(resolveHeatClassName(-5)).toBe("bg-down/20");
    expect(resolveHeatClassName(-40)).toBe("bg-down");
  });
});

describe("formatReturnRate", () => {
  it("양수에만 부호를 붙인다", () => {
    expect(formatReturnRate(12)).toBe("+12%");
    expect(formatReturnRate(-12)).toBe("-12%");
  });

  it("10% 미만은 소수 한 자리까지 보여 준다", () => {
    expect(formatReturnRate(3.14)).toBe("+3.1%");
    expect(formatReturnRate(-9.99)).toBe("-10.0%");
  });

  it("10% 이상은 정수로 끊는다", () => {
    expect(formatReturnRate(23.6)).toBe("+24%");
    expect(formatReturnRate(-100.4)).toBe("-100%");
  });

  it("0 은 부호 없이 찍는다", () => {
    expect(formatReturnRate(0)).toBe("0.0%");
  });
});
