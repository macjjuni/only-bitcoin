import {
  SPACE_AVATAR,
  type SpaceAvatarClip,
  type SpaceAvatarClipRange,
  type SpaceAvatarModel,
} from "@/entities/space";

/**
 * 아바타 한 명이 지금 어떤 모션의 어느 프레임을 틀지 정함. 순수 로직임.
 *
 * 셰이더는 포즈 두 개를 섞을 줄만 앎(`crewSkinning.ts`). 여기서 "어떤 모션에서 어떤
 * 모션으로 넘어가는 중인지" 를 프레임 줄 번호 둘과 섞는 비율로 바꿔 줌.
 *
 * 한 번에 섞는 것은 **이전 모션 → 지금 모션** 둘뿐임. 섞는 도중에 또 바뀌면 그때의
 * 지금 모션이 이전 모션이 됨. 층을 더 쌓으면 정점마다 행렬을 읽는 횟수가 늘어 모바일에서
 * 비쌈.
 */

export const AVATAR_MOTION = {
  /**
   * 한 사이클(두 걸음)이 덮는 이동 거리(m). 걸은 거리에 비례해 사이클을 돌림.
   *
   * 모션의 실제 보폭보다 길게 잡았음. 보폭 그대로 쓰면 게임 속도(걷기 4.5, 달리기 8 m/s)
   * 에서 다리가 과하게 빨라짐. 그리기 배율만큼 보폭이 길어져 같이 곱함.
   */
  metersPerCycle: {
    walk: 1.9 * SPACE_AVATAR.scale,
    run: 3.4 * SPACE_AVATAR.scale,
  },
  /** 이보다 느리면 멈춘 것으로 봄(m/s). */
  movingSpeed: 0.25,
  /** 이보다 빠르면 달리는 모션을 씀(m/s). 걷기(4.5)와 달리기(8)의 사이임. */
  runningSpeed: 6,
  /** 모션을 바꿀 때 섞는 시간(초). */
  fadeSeconds: {
    /** 서기·걷기·달리기 사이. */
    locomotion: 0.16,
    /** 공격·피격·쓰러짐으로 들어갈 때. 길면 조작이 굼떠 보임. */
    action: 0.08,
    /** 한 번 트는 모션이 끝나고 서기·걷기로 돌아올 때. */
    recover: 0.2,
  },
} as const;

export interface AvatarMotionInput {
  nowMs: number;
  deltaSeconds: number;
  /** 수평 이동 속도(m/s). */
  speed: number;
  /** 공중이면 다리를 멈춤. 뛰는 중에 걷는 모션이 돌면 허우적대 보임. */
  isGrounded: boolean;
  /** 공격을 시작한 시각. 안 했으면 `undefined`. */
  attackStartedAt: number | undefined;
  /** 공격 모션을 이 시간에 맞춰 틂(초). 원래 길이(1.08초)보다 짧게 눌러 씀. */
  attackSeconds: number;
  /** 보스에게 맞은 시각. */
  hitStartedAt: number | undefined;
  /** 쓰러져 있는 구간. 앞쪽은 쓰러지고, 끝나는 시각에 맞춰 일어남. */
  knockout: { startedAt: number; until: number } | undefined;
}

export interface AvatarAnimation {
  clip: SpaceAvatarClip;
  /** 지금 모션의 진행도(0…1). */
  phase: number;
  previousClip: SpaceAvatarClip;
  previousPhase: number;
  /** 이전 → 지금으로 넘어온 정도(0…1). 1 이면 지금 모션만 보임. */
  fade: number;
  fadeSeconds: number;
  /** 한 번 트는 모션의 시작 시각. 같은 모션을 다시 시작했는지 가름. */
  startedAt: number | undefined;
  /** 셰이더에 넘길 값. 이전 포즈의 줄, 지금 포즈의 줄, 섞는 비율. */
  rowA: number;
  rowB: number;
  blend: number;
}

interface DesiredMotion {
  clip: SpaceAvatarClip;
  /** 한 번 트는 모션이면 시작 시각과 진행도가 있음. */
  startedAt: number | undefined;
  phase: number | undefined;
}

const LOOPING_CLIPS: ReadonlySet<SpaceAvatarClip> = new Set(["idle", "walk", "run"]);
const MOVING_CLIPS: ReadonlySet<SpaceAvatarClip> = new Set(["walk", "run"]);

// region [Privates]
const clampRatio = (value: number): number => Math.min(1, Math.max(0, value));

const smoothStep = (ratio: number): number => ratio * ratio * (3 - 2 * ratio);

const wrapPhase = (phase: number): number => phase - Math.floor(phase);

/** 모션의 진행도를 `-clips.bin` 의 줄 번호(소수)로 바꿈. 소수부는 셰이더가 다음 줄과 보간함. */
const toRow = (range: SpaceAvatarClipRange, phase: number): number => {
  return range.startFrame + clampRatio(phase) * (range.frameCount - 1);
};

/** 시작 시각과 길이로 진행도를 구함. 아직 시작 전이거나 끝났으면 `undefined`. */
const resolveTimedPhase = (
  startedAt: number | undefined,
  nowMs: number,
  seconds: number,
): number | undefined => {
  if (startedAt === undefined) {
    return undefined;
  }
  const phase = (nowMs - startedAt) / (seconds * 1000);

  return phase >= 0 && phase < 1 ? phase : undefined;
};

/**
 * 쓰러져 있는 동안 틀 모션.
 *
 * 다시 움직일 수 있는 시각에 `Revive` 가 딱 끝나게 뒤에서부터 자리를 잡음. 남는 앞쪽에
 * `Death` 를 넣는데, 구간이 짧으면 그만큼 빨리 쓰러짐.
 */
const resolveKnockoutMotion = (
  knockout: { startedAt: number; until: number },
  nowMs: number,
  model: SpaceAvatarModel,
): DesiredMotion => {
  const reviveMs = Math.min(
    model.clips.revive.seconds * 1000,
    (knockout.until - knockout.startedAt) / 2,
  );
  const reviveStartedAt = knockout.until - reviveMs;

  if (nowMs >= reviveStartedAt) {
    return {
      clip: "revive",
      startedAt: reviveStartedAt,
      phase: clampRatio((nowMs - reviveStartedAt) / reviveMs),
    };
  }
  const deathMs = Math.min(model.clips.death.seconds * 1000, reviveStartedAt - knockout.startedAt);

  return {
    clip: "death",
    startedAt: knockout.startedAt,
    // 다 쓰러진 뒤에는 누운 마지막 자세로 멈춰 있음.
    phase: clampRatio((nowMs - knockout.startedAt) / deathMs),
  };
};

const resolveDesiredMotion = (input: AvatarMotionInput, model: SpaceAvatarModel): DesiredMotion => {
  const { nowMs, knockout } = input;

  if (knockout && nowMs >= knockout.startedAt && nowMs < knockout.until) {
    return resolveKnockoutMotion(knockout, nowMs, model);
  }

  const attackPhase = resolveTimedPhase(input.attackStartedAt, nowMs, input.attackSeconds);
  const hitPhase = resolveTimedPhase(input.hitStartedAt, nowMs, model.clips.hit.seconds);
  // 둘 다 진행 중이면 나중에 시작한 쪽을 틂. 휘두르다 맞으면 움찔하고, 맞고 바로 휘두르면 휘두름.
  const isHitNewer =
    hitPhase !== undefined &&
    (attackPhase === undefined || (input.hitStartedAt ?? 0) > (input.attackStartedAt ?? 0));

  if (isHitNewer) {
    return { clip: "hit", startedAt: input.hitStartedAt, phase: hitPhase };
  }
  if (attackPhase !== undefined) {
    return { clip: "attack", startedAt: input.attackStartedAt, phase: attackPhase };
  }

  if (!input.isGrounded || input.speed <= AVATAR_MOTION.movingSpeed) {
    return { clip: "idle", startedAt: undefined, phase: undefined };
  }

  return {
    clip: input.speed > AVATAR_MOTION.runningSpeed ? "run" : "walk",
    startedAt: undefined,
    phase: undefined,
  };
};

const resolveFadeSeconds = (from: SpaceAvatarClip, to: SpaceAvatarClip): number => {
  const { locomotion, action, recover } = AVATAR_MOTION.fadeSeconds;

  if (!LOOPING_CLIPS.has(to)) {
    return action;
  }

  return LOOPING_CLIPS.has(from) ? locomotion : recover;
};
// endregion

export const createAvatarAnimation = (): AvatarAnimation => ({
  clip: "idle",
  phase: 0,
  previousClip: "idle",
  previousPhase: 0,
  fade: 1,
  fadeSeconds: AVATAR_MOTION.fadeSeconds.locomotion,
  startedAt: undefined,
  rowA: 0,
  rowB: 0,
  blend: 1,
});

/** 한 프레임 진행함. `animation` 을 제자리에서 고치고 `rowA` · `rowB` · `blend` 를 채움. */
export const stepAvatarAnimation = (
  animation: AvatarAnimation,
  input: AvatarMotionInput,
  model: SpaceAvatarModel,
): void => {
  const desired = resolveDesiredMotion(input, model);
  const hasChanged = desired.clip !== animation.clip || desired.startedAt !== animation.startedAt;

  if (hasChanged) {
    const isGaitChange = MOVING_CLIPS.has(animation.clip) && MOVING_CLIPS.has(desired.clip);

    animation.previousClip = animation.clip;
    animation.previousPhase = animation.phase;
    animation.fade = 0;
    animation.fadeSeconds = resolveFadeSeconds(animation.clip, desired.clip);
    // 걷다가 달리면 발 순서를 이어 감. 처음부터 다시 틀면 같은 발을 두 번 내딛음.
    animation.phase = isGaitChange ? animation.phase : 0;
    animation.clip = desired.clip;
    animation.startedAt = desired.startedAt;
  }

  if (desired.phase !== undefined) {
    animation.phase = desired.phase;
  } else if (animation.clip === "idle") {
    animation.phase = wrapPhase(animation.phase + input.deltaSeconds / model.clips.idle.seconds);
  } else if (animation.clip === "walk" || animation.clip === "run") {
    // 시간이 아니라 걸은 거리로 돌림. 시간으로 돌리면 발이 미끄러짐.
    animation.phase = wrapPhase(
      animation.phase +
        (input.speed * input.deltaSeconds) / AVATAR_MOTION.metersPerCycle[animation.clip],
    );
  }

  animation.fade = clampRatio(animation.fade + input.deltaSeconds / animation.fadeSeconds);
  animation.rowB = toRow(model.clips[animation.clip], animation.phase);
  animation.rowA =
    animation.fade >= 1
      ? animation.rowB
      : toRow(model.clips[animation.previousClip], animation.previousPhase);
  animation.blend = smoothStep(animation.fade);
};
