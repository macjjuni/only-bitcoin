/**
 * 렌더 해상도 정책.
 *
 * 모바일 기기는 `devicePixelRatio` 가 3 인데 캔버스를 1.5 로 그리면 기기
 * 해상도의 50% 다. 같은 화면의 DOM HUD 는 3 으로 또렷하게 나오므로 나란히 두면
 * 캔버스만 흐려 보인다.
 *
 * 상한을 2 로 올리면 67% 까지 따라가지만 픽셀 수가 1.78 배로 늘어난다. 약한
 * 기기에서 프레임이 떨어질 수 있으므로 측정값에 따라 되돌릴 수 있게 둔다.
 */

/** 프레임이 넉넉할 때 쓰는 상한. */
export const SPACE_MAX_DPR = 2;

/** 프레임이 모자랄 때 내려가는 하한. 이 아래로는 글자를 못 읽는다. */
export const SPACE_MIN_DPR = 1;

/** 시작 해상도. 처음부터 최대로 올리면 약한 기기의 첫인상이 끊긴다. */
export const SPACE_INITIAL_DPR = 1.5;

/** `PerformanceMonitor` 가 알려주는 0~1 성능 지표를 해상도로 바꾼다. */
export const resolveDprFromPerformanceFactor = (performanceFactor: number): number => {
  if (!Number.isFinite(performanceFactor)) {
    return SPACE_INITIAL_DPR;
  }

  const clampedFactor = Math.min(Math.max(performanceFactor, 0), 1);
  const dprRange = SPACE_MAX_DPR - SPACE_MIN_DPR;

  // 0.25 단위로 끊는다. 미세하게 계속 바뀌면 화면이 들썩인다.
  return Math.round((SPACE_MIN_DPR + dprRange * clampedFactor) * 4) / 4;
};
