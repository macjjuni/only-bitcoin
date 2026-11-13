import { SPACE_BOSS_ATTACKS, type SpaceBossAttack, type SpaceBossState } from "@/entities/space";

/**
 * 보스 소리(공격, 등장·포효 같은 상태 전환)를 언제 틀지 가려냄. 순수 로직이고
 * `bossImpacts.ts` 와 같은 방식임.
 *
 * 소리마다 가장 큰 순간이 음원 시작에서 조금 뒤에 있음. 그만큼 먼저 틀어야 판정과 겹침.
 */

/** 공격을 시작하고 소리를 틀기까지(초). */
export const BOSS_ATTACK_SOUND_CUE_SECONDS: Record<SpaceBossAttack, number> = {
  // 휘익 하고 0.2초 뒤에 찢는 소리가 남.
  swipe: SPACE_BOSS_ATTACKS.swipe.hitSeconds - 0.2,
  // 쿵 하는 순간이 음원 0.1초 지점임.
  slam: SPACE_BOSS_ATTACKS.slam.hitSeconds - 0.1,
  // 땅을 박차는 순간부터 발소리를 냄.
  charge: SPACE_BOSS_ATTACKS.charge.launchSeconds,
};

/**
 * 막 시작한 공격으로 보는 한도(초).
 *
 * 처음 본 공격이 이보다 지나 있으면 도중에 들어온 것으로 보고 지나간 소리를 안 냄.
 */
const FRESH_ATTACK_SECONDS = 0.25;

export interface BossAttackSoundTracker {
  /** 이번 프레임에 소리를 틀 공격. 없으면 `null`. */
  step: (state: SpaceBossState, nowMs: number) => SpaceBossAttack | null;
}

export const createBossAttackSoundTracker = (): BossAttackSoundTracker => {
  /** 보고 있는 공격의 지문. 바뀌면 새 공격임. */
  let signature = "";
  /** 직전 프레임까지 진행한 공격 시간(초). */
  let previousSeconds = 0;

  const step = (state: SpaceBossState, nowMs: number): SpaceBossAttack | null => {
    const attack: SpaceBossAttack | null = state.phase === "attack" ? state.attack : null;

    if (!attack) {
      signature = "";
      return null;
    }

    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;
    const nextSignature = `${attack}:${state.phaseStartedAt}`;

    if (nextSignature !== signature) {
      signature = nextSignature;
      previousSeconds =
        elapsedSeconds <= FRESH_ATTACK_SECONDS ? Number.NEGATIVE_INFINITY : elapsedSeconds;
    }

    const cueSeconds = BOSS_ATTACK_SOUND_CUE_SECONDS[attack];
    const isCueReached = previousSeconds < cueSeconds && elapsedSeconds >= cueSeconds;

    previousSeconds = elapsedSeconds;

    return isCueReached ? attack : null;
  };

  return { step };
};

/** 들어서는 순간 소리를 내는 보스 상태. 등장·포효·비틀거림·쓰러짐임. */
export type BossPhaseSound = "spawn" | "enrage" | "stagger" | "dead";

const PHASE_SOUNDS: ReadonlySet<string> = new Set<BossPhaseSound>([
  "spawn",
  "enrage",
  "stagger",
  "dead",
]);

/**
 * 막 들어선 상태로 보는 한도(초).
 *
 * 공격보다 넉넉히 둠. 상태 전환은 서버 프레임이 와야 알아서 지연만큼 늦게 봄.
 * 너무 좁으면 통신이 느린 사람은 포효·쓰러짐 소리를 못 들음.
 */
const FRESH_PHASE_SECONDS = 1;

export interface BossPhaseSoundTracker {
  /** 이번 프레임에 막 들어선 상태. 소리 낼 게 없으면 `null`. */
  step: (state: SpaceBossState, nowMs: number) => BossPhaseSound | null;
}

export const createBossPhaseSoundTracker = (): BossPhaseSoundTracker => {
  /** 마지막으로 본 상태의 지문. 같은 상태에서 두 번 안 냄. */
  let signature = "";

  const step = (state: SpaceBossState, nowMs: number): BossPhaseSound | null => {
    const nextSignature = `${state.phase}:${state.phaseStartedAt}`;

    if (nextSignature === signature) {
      return null;
    }
    signature = nextSignature;

    if (!PHASE_SOUNDS.has(state.phase)) {
      return null;
    }
    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;

    // 도중에 들어와서 본 상태는 소리를 안 냄. 쓰러진 지 한참 된 보스가 다시 울면 안 됨.
    return elapsedSeconds <= FRESH_PHASE_SECONDS ? (state.phase as BossPhaseSound) : null;
  };

  return { step };
};
