import { describe, expect, it } from "vitest";
import { resolveBubbleLiftPx, resolveNameplateDistanceFactor } from "./overlayLayout";

describe("resolveBubbleLiftPx", () => {
  it("데스크톱은 꼬리 6 + 명찰 절반 10 + 간격 4 만큼 올림", () => {
    expect(resolveBubbleLiftPx(false)).toBe(20);
  });

  it("터치는 명찰이 12/18 로 작게 그려져 명찰 몫을 그만큼 줄임", () => {
    expect(resolveNameplateDistanceFactor(true)).toBe(12);
    expect(resolveBubbleLiftPx(true)).toBeCloseTo(6 + 14 * (12 / 18), 10);
  });
});
