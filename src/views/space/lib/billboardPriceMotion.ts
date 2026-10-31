export const BILLBOARD_PRICE_MOTION = {
  durationMs: 250,
  minRedrawIntervalMs: 1000 / 30,
} as const;

export interface BillboardPriceMotion {
  fromValue: number;
  targetValue: number;
  startedAtMs: number;
}

// region [Privates]
/** 시세가 아직 없거나 유효하지 않으면 포맷 계층의 대시 표시에 쓰는 0으로 맞춘다. */
const normalizePrice = (value: number): number => {
  return Number.isFinite(value) && value > 0 ? value : 0;
};
// endregion

export const createBillboardPriceMotion = (value: number, nowMs = 0): BillboardPriceMotion => {
  const normalizedValue = normalizePrice(value);

  return {
    fromValue: normalizedValue,
    targetValue: normalizedValue,
    startedAtMs: nowMs,
  };
};

/** 상승·하락 모두 250ms 안에 목표에 도착하며 가격 범위 밖으로 튀지 않는다. */
export const readBillboardPriceMotion = (motion: BillboardPriceMotion, nowMs: number): number => {
  const progress = Math.min(
    Math.max((nowMs - motion.startedAtMs) / BILLBOARD_PRICE_MOTION.durationMs, 0),
    1,
  );

  if (progress === 1) {
    return motion.targetValue;
  }

  const easedProgress = 1 - (1 - progress) ** 3;

  return motion.fromValue + (motion.targetValue - motion.fromValue) * easedProgress;
};

/**
 * 새 가격은 현재 표시 중인 값에서 이어 간다.
 *
 * 첫 유효 시세·결측값·모션 축소·탭 복귀는 중간 가격을 만들지 않고 즉시 맞춘다.
 * 같은 목표를 반복 수신하면 시작 시각을 유지해 애니메이션이 끝없이 늘어나지 않는다.
 */
export const updateBillboardPriceMotion = (
  motion: BillboardPriceMotion,
  targetValue: number,
  nowMs: number,
  shouldSnap = false,
): void => {
  const normalizedTarget = normalizePrice(targetValue);

  if (!shouldSnap && normalizedTarget === motion.targetValue) {
    return;
  }

  if (shouldSnap || normalizedTarget === 0 || motion.targetValue === 0) {
    motion.fromValue = normalizedTarget;
    motion.targetValue = normalizedTarget;
    motion.startedAtMs = nowMs;
    return;
  }

  motion.fromValue = readBillboardPriceMotion(motion, nowMs);
  motion.targetValue = normalizedTarget;
  motion.startedAtMs = nowMs;
};

export const isBillboardPriceMotionActive = (
  motion: BillboardPriceMotion,
  nowMs: number,
): boolean => {
  return (
    motion.fromValue !== motion.targetValue &&
    nowMs - motion.startedAtMs < BILLBOARD_PRICE_MOTION.durationMs
  );
};
