const RECONNECT_DELAYS_IN_MILLISECONDS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000] as const;

/** 지수 지연에 full jitter를 적용해 동시에 몰리는 재접속을 분산한다. */
export const calculateReconnectDelayInMilliseconds = (
  retryAttempt: number,
  randomValue = Math.random(),
): number => {
  const delayIndex = Math.min(
    Math.max(retryAttempt, 0),
    RECONNECT_DELAYS_IN_MILLISECONDS.length - 1,
  );
  const maximumDelayInMilliseconds = RECONNECT_DELAYS_IN_MILLISECONDS[delayIndex];
  const boundedRandomValue = Math.min(Math.max(randomValue, 0), 1);

  return Math.floor(maximumDelayInMilliseconds * boundedRandomValue);
};
