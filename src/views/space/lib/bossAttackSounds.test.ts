import { describe, expect, it } from "vitest";
import { SPACE_BOSS_ATTACKS, type SpaceBossState } from "@/entities/space";
import {
  BOSS_ATTACK_SOUND_CUE_SECONDS,
  createBossAttackSoundTracker,
  createBossPhaseSoundTracker,
} from "./bossAttackSounds";

const createState = (overrides: Partial<SpaceBossState> = {}): SpaceBossState => ({
  phase: "attack",
  attack: "slam",
  phaseStartedAt: 0,
  x: 0,
  z: 0,
  yaw: 0,
  attackOriginX: 0,
  attackOriginZ: 0,
  speed: 0,
  lastHitAt: undefined,
  ...overrides,
});

const slamCueMs = BOSS_ATTACK_SOUND_CUE_SECONDS.slam * 1000;

describe("createBossAttackSoundTracker", () => {
  it("소리 낼 시각을 지나는 프레임에 한 번만 알린다", () => {
    const tracker = createBossAttackSoundTracker();
    const state = createState();

    expect(tracker.step(state, 16)).toBeNull();
    expect(tracker.step(state, slamCueMs - 1)).toBeNull();
    expect(tracker.step(state, slamCueMs + 1)).toBe("slam");
    expect(tracker.step(state, slamCueMs + 17)).toBeNull();
  });

  it("도중에 들어와 이미 지나간 소리는 안 낸다", () => {
    const tracker = createBossAttackSoundTracker();
    const state = createState();

    expect(tracker.step(state, slamCueMs + 200)).toBeNull();
    expect(tracker.step(state, slamCueMs + 216)).toBeNull();
  });

  it("공격이 아니면 아무것도 안 낸다", () => {
    const tracker = createBossAttackSoundTracker();

    expect(tracker.step(createState({ phase: "idle", attack: null }), 2_000)).toBeNull();
  });

  it("회전은 도는 동안 한 바퀴 구간마다 다시 알린다", () => {
    const { launchSeconds, arriveSeconds, loopSeconds } = SPACE_BOSS_ATTACKS.spin;
    const tracker = createBossAttackSoundTracker();
    const state = createState({ attack: "spin" });
    const cueSeconds: number[] = [];

    for (let nowMs = 0; nowMs <= (arriveSeconds + 1) * 1000; nowMs += 16) {
      if (tracker.step(state, nowMs) === "spin") {
        cueSeconds.push(nowMs / 1000);
      }
    }

    expect(cueSeconds).toHaveLength((arriveSeconds - launchSeconds) / loopSeconds);
    for (const [index, seconds] of cueSeconds.entries()) {
      const expected = BOSS_ATTACK_SOUND_CUE_SECONDS.spin + index * loopSeconds;

      expect(seconds).toBeGreaterThanOrEqual(expected);
      expect(seconds).toBeLessThan(expected + 0.02);
    }
  });

  it("같은 공격을 다시 시작하면 다시 알린다", () => {
    const tracker = createBossAttackSoundTracker();

    tracker.step(createState(), 16);
    expect(tracker.step(createState(), slamCueMs + 1)).toBe("slam");

    const secondStartedAt = 10_000;
    const second = createState({ phaseStartedAt: secondStartedAt });

    expect(tracker.step(second, secondStartedAt + 16)).toBeNull();
    expect(tracker.step(second, secondStartedAt + slamCueMs + 1)).toBe("slam");
  });
});

describe("createBossPhaseSoundTracker", () => {
  it("막 들어선 상태를 한 번만 알린다", () => {
    const tracker = createBossPhaseSoundTracker();
    const enrage = createState({ phase: "enrage", attack: null, phaseStartedAt: 1_000 });

    expect(tracker.step(enrage, 1_016)).toBe("enrage");
    expect(tracker.step(enrage, 1_032)).toBeNull();
  });

  it("소리가 없는 상태는 안 알린다", () => {
    const tracker = createBossPhaseSoundTracker();

    expect(tracker.step(createState({ phase: "idle", attack: null }), 16)).toBeNull();
    expect(tracker.step(createState(), 16)).toBeNull();
  });

  it("도중에 들어와서 본 상태는 안 알린다", () => {
    const tracker = createBossPhaseSoundTracker();
    const dead = createState({ phase: "dead", attack: null, phaseStartedAt: 0 });

    expect(tracker.step(dead, 5_000)).toBeNull();
    expect(tracker.step(dead, 5_016)).toBeNull();
  });
});
