/** 첫 폭죽과 동떨어진 축하음이 나오지 않도록 재생 시작을 기다리는 상한. */
const SOUND_START_TIMEOUT_MS = 1000;

type CelebrationAudio = Pick<HTMLAudioElement, "play" | "pause" | "currentTime">;

export interface CelebrationSoundPlayer {
  play: () => void;
  stop: () => void;
}

/** 재생 대기, 연타, 숨김, 해제를 같은 취소 경로로 처리한다. */
export const createCelebrationSoundPlayer = (audio: CelebrationAudio): CelebrationSoundPlayer => {
  let attemptId = 0;
  let startTimer: ReturnType<typeof setTimeout> | undefined;

  const clearStartTimer = (): void => {
    clearTimeout(startTimer);
    startTimer = undefined;
  };

  const stop = (): void => {
    attemptId += 1;
    clearStartTimer();
    audio.pause();
    audio.currentTime = 0;
  };

  const play = (): void => {
    stop();
    const currentAttemptId = attemptId;
    const requestedAt = performance.now();
    startTimer = setTimeout(stop, SOUND_START_TIMEOUT_MS);

    void audio.play().then(
      () => {
        if (attemptId !== currentAttemptId) {
          return;
        }
        // 브라우저가 타이머 실행을 미뤘어도 늦게 시작한 음원은 재생하지 않는다.
        if (performance.now() - requestedAt >= SOUND_START_TIMEOUT_MS) {
          stop();
          return;
        }
        clearStartTimer();
      },
      () => {
        if (attemptId === currentAttemptId) {
          stop();
        }
      },
    );
  };

  return { play, stop };
};
