import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCelebrationSoundPlayer } from "./celebrationSoundPlayer";

const createPendingPlayback = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createAudio = () => ({
  currentTime: 2,
  pause: vi.fn(),
  play: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

describe("폭죽 축하음 재생", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("제때 시작한 음원은 끝까지 재생한다", async () => {
    const audio = createAudio();
    const player = createCelebrationSoundPlayer(audio);
    player.play();
    await vi.advanceTimersByTimeAsync(4000);
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("1초 이상 로딩 중인 음원은 취소한다", async () => {
    const pending = createPendingPlayback();
    const audio = createAudio();
    audio.play.mockReturnValue(pending.promise);
    const player = createCelebrationSoundPlayer(audio);
    player.play();
    await vi.advanceTimersByTimeAsync(999);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(audio.pause).toHaveBeenCalledTimes(2);
    pending.resolve();
    await vi.advanceTimersByTimeAsync(10000);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("숨김 또는 해제 시 대기 중인 재생과 타이머를 취소한다", async () => {
    const pending = createPendingPlayback();
    const audio = createAudio();
    audio.play.mockReturnValue(pending.promise);
    const player = createCelebrationSoundPlayer(audio);
    player.play();
    player.stop();
    pending.reject(new Error("Playback interrupted"));
    await vi.advanceTimersByTimeAsync(2000);
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("연타로 취소된 이전 요청의 거부가 새 재생을 멈추지 않는다", async () => {
    const previous = createPendingPlayback();
    const audio = createAudio();
    audio.play.mockReturnValueOnce(previous.promise);
    const player = createCelebrationSoundPlayer(audio);
    player.play();
    await vi.advanceTimersByTimeAsync(500);
    player.play();
    previous.reject(new Error("Old playback interrupted"));
    await vi.advanceTimersByTimeAsync(4000);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("자동 재생 차단을 처리하고 다음 클릭에서는 다시 시도한다", async () => {
    const audio = createAudio();
    audio.play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    const player = createCelebrationSoundPlayer(audio);
    player.play();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    player.play();
    await vi.advanceTimersByTimeAsync(1500);
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.pause).toHaveBeenCalledTimes(3);
  });
});
