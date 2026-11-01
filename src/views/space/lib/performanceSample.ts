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
  /**
   * 최근 1초의 프레임 간격. 실시간 FPS 에만 쓴다.
   *
   * 10초 표본은 한 번 끝나면 멈춘다 — 재현 가능한 숫자를 남기려면 그래야 한다.
   * 하지만 돌아다니며 "지금 몇 fps 인가" 를 보려면 계속 갱신되는 값도 필요하다.
   * 그래서 준비 구간·완료 이후에도 이 창은 계속 채운다.
   */
  liveFrameMilliseconds: number[];
  elapsedMilliseconds: number;
  frameMilliseconds: number[];
  maxDrawCalls: number;
  maxTriangles: number;
  minDpr: number;
  maxDpr: number;
}

export const createSpacePerformanceSample = (): SpacePerformanceSample => ({
  warmupMilliseconds: 0,
  liveFrameMilliseconds: [],
  elapsedMilliseconds: 0,
  frameMilliseconds: [],
  maxDrawCalls: 0,
  maxTriangles: 0,
  minDpr: Number.POSITIVE_INFINITY,
  maxDpr: 0,
});

/** 실시간 FPS 를 평균 낼 창. 1초면 걸을 때의 출렁임이 보이고 숫자가 튀지 않는다. */
const LIVE_WINDOW_MS = 1_000;

/** 셰이더·텍스처 준비 5초를 제외하고 10초 동안 실제 렌더 프레임을 모은다. */
export const recordSpacePerformanceFrame = (
  sample: SpacePerformanceSample,
  frame: SpacePerformanceFrame,
): void => {
  if (!Number.isFinite(frame.deltaMilliseconds) || frame.deltaMilliseconds <= 0) {
    return;
  }

  // 실시간 창은 준비 구간과 완료 이후에도 계속 채운다.
  sample.liveFrameMilliseconds.push(frame.deltaMilliseconds);
  let liveWindowMilliseconds = sample.liveFrameMilliseconds.reduce(
    (total, milliseconds) => total + milliseconds,
    0,
  );
  while (sample.liveFrameMilliseconds.length > 1 && liveWindowMilliseconds > LIVE_WINDOW_MS) {
    liveWindowMilliseconds -= sample.liveFrameMilliseconds.shift() ?? 0;
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

  const liveWindowMilliseconds = sample.liveFrameMilliseconds.reduce(
    (total, milliseconds) => total + milliseconds,
    0,
  );

  return {
    /** 최근 1초의 FPS. 표본이 끝난 뒤에도 계속 갱신된다. */
    liveFramesPerSecond:
      liveWindowMilliseconds > 0
        ? (sample.liveFrameMilliseconds.length * 1_000) / liveWindowMilliseconds
        : 0,
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
