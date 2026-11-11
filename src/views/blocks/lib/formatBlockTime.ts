const millisecondsPerSecond = 1_000;
const millisecondsPerMinute = 60_000;
const minutesPerHour = 60;

/** 브라우저 시계가 준비되기 전에는 대체 문구를, 이후에는 전달받은 시각 기준 경과 시간을 표시한다. */
export const formatBlockElapsedTime = (
  timestampInSeconds: number | undefined,
  currentTimeInMilliseconds: number | null,
): string => {
  if (
    currentTimeInMilliseconds === null ||
    !timestampInSeconds ||
    !Number.isFinite(timestampInSeconds) ||
    !Number.isFinite(currentTimeInMilliseconds)
  ) {
    return "-";
  }

  const elapsedMinutes = Math.floor(
    (currentTimeInMilliseconds - timestampInSeconds * millisecondsPerSecond) /
      millisecondsPerMinute,
  );

  if (elapsedMinutes <= 0) {
    return "조금 전";
  }
  if (elapsedMinutes < minutesPerHour) {
    return `${elapsedMinutes}분 전`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / minutesPerHour);
  const remainingMinutes = elapsedMinutes % minutesPerHour;
  return `${elapsedHours}시간 ${remainingMinutes}분 전`;
};
