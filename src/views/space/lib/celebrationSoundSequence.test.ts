import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCelebrationSoundSequence } from "./celebrationSoundSequence";

describe("폭죽 3회 효과음", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("0초, 10초, 20초에 각각 한 번 재생한다", () => {
    const playedAt: number[] = [];
    const player = { play: () => playedAt.push(performance.now()), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => true);
    sequence.play();
    vi.advanceTimersByTime(30000);
    expect(playedAt).toEqual([0, 10000, 20000]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("재발동하면 이전 예약은 취소하고 새 폭죽 일정에 맞춘다", () => {
    const playedAt: number[] = [];
    const player = { play: () => playedAt.push(performance.now()), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => true);
    sequence.play();
    vi.advanceTimersByTime(5000);
    sequence.play();
    vi.advanceTimersByTime(30000);
    expect(playedAt).toEqual([0, 5000, 15000, 25000]);
  });

  it("숨긴 동안 놓친 회차는 건너뛰고 이후 회차는 재생한다", () => {
    let visible = true;
    const player = { play: vi.fn(), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => visible);
    sequence.play();
    visible = false;
    vi.advanceTimersByTime(15000);
    expect(player.play).toHaveBeenCalledTimes(1);
    visible = true;
    vi.advanceTimersByTime(5000);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it("타이머가 늦게 실행되어도 지난 효과음을 뒤늦게 틀지 않는다", () => {
    const player = { play: vi.fn(), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => true);
    sequence.play();
    vi.spyOn(performance, "now").mockReturnValue(25000);
    vi.advanceTimersByTime(25000);
    expect(player.play).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("늦게 입장하면 남은 회차만 재생하고 시계 보정에도 같은 소리를 반복하지 않는다", () => {
    const player = { play: vi.fn(), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => true);
    vi.advanceTimersByTime(15000);
    sequence.schedule("room-event", 0);
    expect(player.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(player.play).toHaveBeenCalledTimes(1);
    sequence.schedule("room-event", 50);
    vi.advanceTimersByTime(1000);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("페이지를 떠나면 남은 효과음 예약을 모두 취소한다", () => {
    const player = { play: vi.fn(), stop: vi.fn() };
    const sequence = createCelebrationSoundSequence(player, () => true);
    sequence.play();
    sequence.stop();
    vi.advanceTimersByTime(30000);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
