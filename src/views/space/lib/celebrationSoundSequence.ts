import type { CelebrationSoundPlayer } from "./celebrationSoundPlayer";
import { SCREEN_CELEBRATION } from "./screenCelebration";

export interface CelebrationSoundSequence extends CelebrationSoundPlayer {
  schedule: (eventId: string, startsAt: number) => void;
}

/** 서버 시작 시각을 로컬 시각으로 변환해 예약한다. 시계 보정·재접속에도 소비한 회차는 반복하지 않는다. */
export const createCelebrationSoundSequence = (
  player: CelebrationSoundPlayer,
  isVisible: () => boolean,
): CelebrationSoundSequence => {
  let timers: ReturnType<typeof setTimeout>[] = [];
  let currentEventId: string | null = null;
  let localEventId = 0;
  const consumedBursts = new Set<number>();

  const clearTimers = (): void => {
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers = [];
  };

  const stop = (): void => {
    clearTimers();
    player.stop();
  };

  const schedule = (eventId: string, startsAt: number): void => {
    clearTimers();
    if (eventId !== currentEventId) {
      player.stop();
      currentEventId = eventId;
      consumedBursts.clear();
    }
    for (let burstIndex = 0; burstIndex < SCREEN_CELEBRATION.burstCount; burstIndex += 1) {
      if (consumedBursts.has(burstIndex)) {
        continue;
      }
      const scheduledAt = startsAt + burstIndex * SCREEN_CELEBRATION.burstIntervalSeconds * 1000;
      const playBurst = (): void => {
        consumedBursts.add(burstIndex);
        if (isVisible() && performance.now() - scheduledAt < 1000) {
          player.play();
        }
      };
      const delayMs = scheduledAt - performance.now();
      if (delayMs <= 0) {
        playBurst();
      } else {
        timers.push(setTimeout(playBurst, delayMs));
      }
    }
  };

  const play = (): void => {
    localEventId += 1;
    schedule(`local-${localEventId}`, performance.now());
  };

  return { play, stop, schedule };
};
