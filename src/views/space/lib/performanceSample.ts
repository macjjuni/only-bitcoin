export const SPACE_PERFORMANCE_WARMUP_MS = 5_000;
export const SPACE_PERFORMANCE_SAMPLE_MS = 10_000;

export interface SpacePerformanceFrame {
  deltaMilliseconds: number;
  drawCalls: number;
  triangles: number;
  dpr: number;
}

export interface SpacePerformanceSample {
  warmupMilliseconds: number;
  elapsedMilliseconds: number;
  frameMilliseconds: number[];
  maxDrawCalls: number;
  maxTriangles: number;
  minDpr: number;
  maxDpr: number;
}

export const createSpacePerformanceSample = (): SpacePerformanceSample => ({
  warmupMilliseconds: 0,
  elapsedMilliseconds: 0,
  frameMilliseconds: [],
  maxDrawCalls: 0,
  maxTriangles: 0,
  minDpr: Number.POSITIVE_INFINITY,
  maxDpr: 0,
});

/** 셰이더·텍스처 준비 5초를 제외하고 10초 동안 실제 렌더 프레임을 모은다. */
export const recordSpacePerformanceFrame = (
  sample: SpacePerformanceSample,
  frame: SpacePerformanceFrame,
): void => {
  if (!Number.isFinite(frame.deltaMilliseconds) || frame.deltaMilliseconds <= 0) {
    return;
  }

  if (sample.warmupMilliseconds < SPACE_PERFORMANCE_WARMUP_MS) {
    sample.warmupMilliseconds += frame.deltaMilliseconds;
    return;
  }

  if (sample.elapsedMilliseconds >= SPACE_PERFORMANCE_SAMPLE_MS) {
    return;
  }

  sample.elapsedMilliseconds += frame.deltaMilliseconds;
  sample.frameMilliseconds.push(frame.deltaMilliseconds);
  sample.maxDrawCalls = Math.max(sample.maxDrawCalls, frame.drawCalls);
  sample.maxTriangles = Math.max(sample.maxTriangles, frame.triangles);
  sample.minDpr = Math.min(sample.minDpr, frame.dpr);
  sample.maxDpr = Math.max(sample.maxDpr, frame.dpr);
};

export const summarizeSpacePerformance = (sample: SpacePerformanceSample) => {
  const sortedMilliseconds = [...sample.frameMilliseconds].sort((first, second) => first - second);
  const frameCount = sortedMilliseconds.length;
  const p95Index = Math.max(Math.ceil(frameCount * 0.95) - 1, 0);

  return {
    isComplete: sample.elapsedMilliseconds >= SPACE_PERFORMANCE_SAMPLE_MS,
    isWarmingUp: sample.warmupMilliseconds < SPACE_PERFORMANCE_WARMUP_MS,
    elapsedSeconds: sample.elapsedMilliseconds / 1_000,
    frameCount,
    framesPerSecond:
      sample.elapsedMilliseconds > 0 ? (frameCount * 1_000) / sample.elapsedMilliseconds : 0,
    p95FrameMilliseconds: sortedMilliseconds[p95Index] ?? 0,
    maxDrawCalls: sample.maxDrawCalls,
    maxTriangles: sample.maxTriangles,
    minDpr: frameCount > 0 ? sample.minDpr : 0,
    maxDpr: sample.maxDpr,
  };
};
