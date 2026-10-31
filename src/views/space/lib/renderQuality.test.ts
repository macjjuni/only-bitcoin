import { describe, expect, it } from "vitest";
import {
  resolveDprFromPerformanceFactor,
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
