import { describe, expect, it } from "vitest";
import {
  createSpacePerformanceSample,
  recordSpacePerformanceFrame,
  summarizeSpacePerformance,
} from "./performanceSample";

const recordFrame = (
  sample: ReturnType<typeof createSpacePerformanceSample>,
  deltaMilliseconds = 1_000,
  drawCalls = 20,
) => {
  recordSpacePerformanceFrame(sample, {
    deltaMilliseconds,
    drawCalls,
    triangles: 12_000,
    dpr: 1.5,
  });
};

describe("space performance sample", () => {
  it("준비 프레임은 제외하고 렌더 시간의 합으로 FPS와 p95를 계산한다", () => {
    const sample = createSpacePerformanceSample();
    for (let frameIndex = 0; frameIndex < 5; frameIndex += 1) {
      recordFrame(sample, 1_000, 500);
    }

    recordFrame(sample, 10, 23);
    recordFrame(sample, 30, 27);

    expect(summarizeSpacePerformance(sample)).toMatchObject({
      frameCount: 2,
      framesPerSecond: 50,
      p95FrameMilliseconds: 30,
      maxDrawCalls: 27,
      maxTriangles: 12_000,
      minDpr: 1.5,
      maxDpr: 1.5,
      isWarmingUp: false,
      isComplete: false,
    });
  });

  it("10초 측정이 끝나면 수치를 고정하고 빈 표본은 0으로 표시한다", () => {
    const sample = createSpacePerformanceSample();
    expect(summarizeSpacePerformance(sample).framesPerSecond).toBe(0);
    expect(summarizeSpacePerformance(sample).minDpr).toBe(0);

    for (let frameIndex = 0; frameIndex < 15; frameIndex += 1) {
      recordFrame(sample);
    }
    recordFrame(sample, 1_000, 500);

    expect(summarizeSpacePerformance(sample)).toMatchObject({
      frameCount: 10,
      elapsedSeconds: 10,
      maxDrawCalls: 20,
      isComplete: true,
    });
  });

  it("유효하지 않은 프레임 시간은 준비·측정 시간에 포함하지 않는다", () => {
    const sample = createSpacePerformanceSample();
    for (const deltaMilliseconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      recordFrame(sample, deltaMilliseconds);
    }
    expect(sample.warmupMilliseconds).toBe(0);
    expect(sample.frameMilliseconds).toEqual([]);
  });
});
