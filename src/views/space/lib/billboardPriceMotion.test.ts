import { describe, expect, it } from "vitest";
import {
  BILLBOARD_PRICE_MOTION,
  createBillboardPriceMotion,
  isBillboardPriceMotionActive,
  readBillboardPriceMotion,
  updateBillboardPriceMotion,
} from "./billboardPriceMotion";

describe("비트코인 전광판 가격 모션", () => {
  it("최초 유효 시세는 0부터 세지 않고 즉시 표시한다", () => {
    const motion = createBillboardPriceMotion(0);
    updateBillboardPriceMotion(motion, 100_000, 500);

    expect(readBillboardPriceMotion(motion, 500)).toBe(100_000);
    expect(isBillboardPriceMotionActive(motion, 500)).toBe(false);
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("유효하지 않은 가격 %s는 초기화·갱신 모두 0으로 표시하고 복구 시 즉시 맞춘다", (invalidPrice) => {
    expect(createBillboardPriceMotion(invalidPrice).targetValue).toBe(0);

    const motion = createBillboardPriceMotion(100);
    updateBillboardPriceMotion(motion, 200, 10);
    updateBillboardPriceMotion(motion, invalidPrice, 60);

    expect(readBillboardPriceMotion(motion, 60)).toBe(0);
    expect(isBillboardPriceMotionActive(motion, 60)).toBe(false);

    updateBillboardPriceMotion(motion, 300, 70);
    expect(readBillboardPriceMotion(motion, 70)).toBe(300);
    expect(isBillboardPriceMotionActive(motion, 70)).toBe(false);
  });

  it.each([
    [100, 200, 187.5],
    [200, 100, 112.5],
  ])("%s에서 %s로 상승·하락할 때 cubic 감속으로 움직이고 정확히 도착한다", (fromValue, targetValue, midpoint) => {
    const motion = createBillboardPriceMotion(fromValue);
    updateBillboardPriceMotion(motion, targetValue, 1_000);

    expect(readBillboardPriceMotion(motion, 999)).toBe(fromValue);
    expect(readBillboardPriceMotion(motion, 1_125)).toBe(midpoint);
    expect(isBillboardPriceMotionActive(motion, 1_249)).toBe(true);
    expect(readBillboardPriceMotion(motion, 1_250)).toBe(targetValue);
    expect(isBillboardPriceMotionActive(motion, 1_250)).toBe(false);
    expect(readBillboardPriceMotion(motion, 5_000)).toBe(targetValue);

    for (let elapsedMs = 0; elapsedMs <= BILLBOARD_PRICE_MOTION.durationMs; elapsedMs += 5) {
      const displayedValue = readBillboardPriceMotion(motion, 1_000 + elapsedMs);
      expect(displayedValue).toBeGreaterThanOrEqual(Math.min(fromValue, targetValue));
      expect(displayedValue).toBeLessThanOrEqual(Math.max(fromValue, targetValue));
    }
  });

  it("전환 중 새 목표가 오면 현재 표시값을 유지한 채 방향을 바꾼다", () => {
    const motion = createBillboardPriceMotion(100);
    updateBillboardPriceMotion(motion, 200, 0);
    const displayedBeforeRetarget = readBillboardPriceMotion(motion, 100);

    updateBillboardPriceMotion(motion, 80, 100);

    expect(readBillboardPriceMotion(motion, 100)).toBe(displayedBeforeRetarget);
    expect(readBillboardPriceMotion(motion, 225)).toBeLessThan(displayedBeforeRetarget);
    expect(readBillboardPriceMotion(motion, 350)).toBe(80);
  });

  it("같은 목표를 반복 수신해도 250ms 도착 시각을 미루지 않는다", () => {
    const motion = createBillboardPriceMotion(100);
    updateBillboardPriceMotion(motion, 200, 0);
    updateBillboardPriceMotion(motion, 200, 100);
    updateBillboardPriceMotion(motion, 200, 200);

    expect(motion.startedAtMs).toBe(0);
    expect(readBillboardPriceMotion(motion, 250)).toBe(200);
    expect(isBillboardPriceMotionActive(motion, 250)).toBe(false);
  });

  it("모션 축소가 켜지면 같은 목표로 진행 중인 전환도 즉시 끝낸다", () => {
    const motion = createBillboardPriceMotion(100);
    updateBillboardPriceMotion(motion, 200, 0);
    updateBillboardPriceMotion(motion, 200, 100, true);

    expect(readBillboardPriceMotion(motion, 100)).toBe(200);
    expect(isBillboardPriceMotionActive(motion, 100)).toBe(false);
  });

  it("장시간 후 탭 복귀 시 최신 가격으로 맞추고 이후 변화부터 다시 보간한다", () => {
    const motion = createBillboardPriceMotion(100);
    updateBillboardPriceMotion(motion, 200, 0);
    updateBillboardPriceMotion(motion, 500, 60_000, true);

    expect(readBillboardPriceMotion(motion, 60_000)).toBe(500);
    expect(isBillboardPriceMotionActive(motion, 60_000)).toBe(false);

    updateBillboardPriceMotion(motion, 600, 60_250);
    expect(readBillboardPriceMotion(motion, 60_250)).toBe(500);
    expect(readBillboardPriceMotion(motion, 60_500)).toBe(600);
  });

  it("금액 반올림을 하지 않아 달러 소수 가격도 연속적으로 보간한다", () => {
    const motion = createBillboardPriceMotion(100.01);
    updateBillboardPriceMotion(motion, 100.02, 0);

    expect(readBillboardPriceMotion(motion, 125)).toBeCloseTo(100.01875, 10);
    expect(readBillboardPriceMotion(motion, 250)).toBe(100.02);
  });
});
