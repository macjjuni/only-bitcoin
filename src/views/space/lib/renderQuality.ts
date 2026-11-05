/**
 * 렌더 해상도 정책.
 *
 * 모바일 기기는 `devicePixelRatio` 가 3 인데 캔버스를 1.5 로 그리면 기기
 * 해상도의 50% 임. 같은 화면의 DOM HUD 는 3 으로 또렷하게 나오므로 나란히 두면
 * 캔버스만 흐려 보임.
 *
 * 그래서 모바일은 시작 2, 상한 2.5 로 데스크톱보다 높게 잡았음(기기 해상도의
 * 67~83%). 픽셀 수가 늘어 약한 기기는 프레임이 떨어질 수 있으므로 측정값에
 * 따라 하한까지 되돌림.
 */

export interface DprPolicy {
  /** 프레임이 모자랄 때 내려가는 하한. 이 아래로는 글자를 못 읽음. */
  min: number;
  /** 시작 해상도. 처음부터 최대로 올리면 약한 기기의 첫인상이 끊김. */
  initial: number;
  /** 프레임이 넉넉할 때 쓰는 상한. */
  max: number;
}

export const SPACE_DPR_POLICY = {
  desktop: { min: 1, initial: 1.5, max: 2 },
  mobile: { min: 1, initial: 2, max: 2.5 },
} as const satisfies Record<string, DprPolicy>;

/** 데스크톱 기준값. 정책을 모를 때의 기본값으로도 씀. */
export const SPACE_MAX_DPR = SPACE_DPR_POLICY.desktop.max;
export const SPACE_MIN_DPR = SPACE_DPR_POLICY.desktop.min;
export const SPACE_INITIAL_DPR = SPACE_DPR_POLICY.desktop.initial;

/**
 * 기기에 맞는 해상도 정책.
 *
 * 모바일은 기기 dpr 을 넘겨 그리지 않음. dpr 2 폰에서 2.5 로 그리면 화면에
 * 보이지도 않는 픽셀에 GPU 를 씀.
 */
export const resolveDprPolicy = (isMobile: boolean, deviceDpr: number): DprPolicy => {
  if (!isMobile) {
    return SPACE_DPR_POLICY.desktop;
  }

  const deviceCeiling =
    Number.isFinite(deviceDpr) && deviceDpr >= 1 ? deviceDpr : SPACE_DPR_POLICY.mobile.max;
  const max = Math.min(SPACE_DPR_POLICY.mobile.max, deviceCeiling);

  return {
    min: Math.min(SPACE_DPR_POLICY.mobile.min, max),
    initial: Math.min(SPACE_DPR_POLICY.mobile.initial, max),
    max,
  };
};

/** `PerformanceMonitor` 가 알려주는 0~1 성능 지표를 해상도로 바꾼다. */
export const resolveDprFromPerformanceFactor = (
  performanceFactor: number,
  policy: DprPolicy = SPACE_DPR_POLICY.desktop,
): number => {
  if (!Number.isFinite(performanceFactor)) {
    return policy.initial;
  }

  const clampedFactor = Math.min(Math.max(performanceFactor, 0), 1);
  const dprRange = policy.max - policy.min;

  // 0.25 단위로 끊음. 미세하게 계속 바뀌면 화면이 들썩임.
  return Math.round((policy.min + dprRange * clampedFactor) * 4) / 4;
};
