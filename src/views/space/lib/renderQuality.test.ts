import { describe, expect, it } from "vitest";
import {
  resolveDprFromPerformanceFactor,
  resolveDprPolicy,
  SPACE_DPR_POLICY,
  SPACE_INITIAL_DPR,
  SPACE_MAX_DPR,
  SPACE_MIN_DPR,
} from "@/views/space/lib/renderQuality";

describe("resolveDprFromPerformanceFactor", () => {
  it("성능이 충분하면 상한까지 올린다", () => {
    expect(resolveDprFromPerformanceFactor(1)).toBe(SPACE_MAX_DPR);
  });

  it("성능이 바닥이면 하한까지 내린다", () => {
    expect(resolveDprFromPerformanceFactor(0)).toBe(SPACE_MIN_DPR);
  });

  it("범위를 벗어난 지표도 하한·상한 안으로 자른다", () => {
    expect(resolveDprFromPerformanceFactor(-5)).toBe(SPACE_MIN_DPR);
    expect(resolveDprFromPerformanceFactor(5)).toBe(SPACE_MAX_DPR);
  });

  it("0.25 단위로 끊어 화면이 들썩이지 않게 한다", () => {
    for (const factor of [0.13, 0.37, 0.62, 0.88]) {
      expect((resolveDprFromPerformanceFactor(factor) * 4) % 1).toBe(0);
    }
  });

  it("성능 지표가 높을수록 해상도가 높거나 같다", () => {
    let previousDpr = 0;

    for (let factor = 0; factor <= 1; factor += 0.1) {
      const dpr = resolveDprFromPerformanceFactor(factor);

      expect(dpr).toBeGreaterThanOrEqual(previousDpr);
      previousDpr = dpr;
    }
  });

  it("지표를 읽지 못하면 시작 해상도로 둔다", () => {
    expect(resolveDprFromPerformanceFactor(Number.NaN)).toBe(SPACE_INITIAL_DPR);
  });
});

describe("resolveDprPolicy", () => {
  it("데스크톱은 기존 범위를 그대로 쓴다", () => {
    expect(resolveDprPolicy(false, 3)).toEqual(SPACE_DPR_POLICY.desktop);
  });

  it("모바일은 시작 2, 상한 2.5 로 데스크톱보다 높게 그린다", () => {
    expect(resolveDprPolicy(true, 3)).toEqual({ min: 1, initial: 2, max: 2.5 });
  });

  it("모바일도 기기 dpr 을 넘겨 그리지 않는다", () => {
    expect(resolveDprPolicy(true, 2)).toEqual({ min: 1, initial: 2, max: 2 });
    expect(resolveDprPolicy(true, 1.5)).toEqual({ min: 1, initial: 1.5, max: 1.5 });
  });

  it("기기 dpr 을 못 읽으면 모바일 기본 범위로 둔다", () => {
    expect(resolveDprPolicy(true, Number.NaN)).toEqual(SPACE_DPR_POLICY.mobile);
  });

  it("성능 지표가 모바일 범위 안에서 움직인다", () => {
    const policy = resolveDprPolicy(true, 3);

    expect(resolveDprFromPerformanceFactor(1, policy)).toBe(2.5);
    expect(resolveDprFromPerformanceFactor(0, policy)).toBe(1);
    expect(resolveDprFromPerformanceFactor(Number.NaN, policy)).toBe(2);
  });
});
