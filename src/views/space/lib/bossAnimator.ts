import {
  AdditiveAnimationBlendMode,
  type AnimationAction,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
} from "three";
import {
  SPACE_BOSS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_HIT,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_STRIDE,
  type SpaceBossPhase,
  type SpaceBossState,
} from "@/entities/space";
import type { BossClipKey, BossModel } from "./bossModel";

/**
 * 보스 상태를 받아 모션·위치·예고 표시를 맞춤.
 *
 * 상태가 "언제 무엇을 시작했는지" 만 들고 있어서, 여기서는 매 프레임 지금 시각과
 * 견줘 모션의 그 지점을 틂. 프레임이 밀리거나 중간에 들어와도 판정 시각과 어긋나지 않음.
 */

export interface BossAnimator {
  /**
   * 한 프레임 진행함.
   *
   * @returns 땅 위에 나와 있는 정도(0…1). 접지 그림자 진하기에 씀.
   */
  update: (state: SpaceBossState, nowMs: number, deltaSeconds: number) => number;
  /** 버린 뒤에는 다시 쓰지 못함. 같은 모델로 새로 만드는 것은 됨. */
  dispose: () => void;
}

/** 모션을 바꿀 때 섞는 시간(초). */
const BOSS_FADE_SECONDS = {
  /** 서기·걷기·달리기 사이. 자세 차이가 커서(달리기는 앞으로 숙임) 길게 섞음. */
  locomotion: 0.28,
  /** 공격·포효로 들어갈 때. 길면 예고와 몸동작이 어긋나 보임. */
  action: 0.12,
  /** 쓰러질 때. 맞는 순간 바로 넘어가야 함. */
  death: 0.08,
} as const;

/** 모델 전방이 +Z, 상태의 yaw 는 전방 −Z 기준이라 반 바퀴 돌려 붙임. */
const MODEL_YAW_OFFSET = Math.PI;

const LOOPING_PHASES: ReadonlySet<SpaceBossPhase> = new Set(["idle", "walk", "run"]);

// region [Privates]
const resolveClipKey = (state: SpaceBossState): BossClipKey | null => {
  switch (state.phase) {
    case "hidden":
      return null;
    case "spawn":
      return "spawn";
    case "idle":
      return "idle";
    case "walk":
      return "walk";
    case "run":
      return "run";
    case "turn":
      return "turn";
    case "attack":
      return state.attack ?? "idle";
    case "stagger":
      return "stagger";
    case "enrage":
      return "enrage";
    case "dead":
      return "death";
    default:
      throw new Error(`알 수 없는 보스 상태입니다: ${state.phase satisfies never}`);
  }
};

const resolveFadeSeconds = (phase: SpaceBossPhase): number => {
  if (phase === "dead") {
    return BOSS_FADE_SECONDS.death;
  }

  return LOOPING_PHASES.has(phase) ? BOSS_FADE_SECONDS.locomotion : BOSS_FADE_SECONDS.action;
};

/** 걷기·달리기는 실제 속도에 맞춰 돌림. 속도가 모션 보폭과 다르면 발이 미끄러짐. */
const resolveTimeScale = (state: SpaceBossState): number => {
  if (state.phase === "walk") {
    return state.speed / SPACE_BOSS_STRIDE.walk;
  }

  if (state.phase === "run") {
    return state.speed / SPACE_BOSS_STRIDE.run;
  }

  return 1;
};

const easeOutCubic = (ratio: number): number => 1 - (1 - ratio) ** 3;

const clampRatio = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * 땅 위로 나와 있는 정도(0…1).
 *
 * 등장 때는 솟아오르고 처치 뒤에는 가라앉음. 에셋 모션에는 나타남·사라짐이 없어서
 * (첫 프레임부터 통째로 서 있음) 눈밭을 뚫고 오르내리는 것으로 채웠음.
 */
const resolveEmergence = (state: SpaceBossState, elapsedSeconds: number): number => {
  if (state.phase === "spawn") {
    return easeOutCubic(clampRatio(elapsedSeconds / SPACE_BOSS_SPAWN.riseSeconds));
  }

  if (state.phase === "dead") {
    const sinkStart = SPACE_BOSS_CLIP_SECONDS.death + SPACE_BOSS_DEATH.holdSeconds;
    const sinkRatio = clampRatio((elapsedSeconds - sinkStart) / SPACE_BOSS_DEATH.sinkSeconds);

    return 1 - sinkRatio * sinkRatio;
  }

  return state.phase === "hidden" ? 0 : 1;
};

/** 한 번 트는 모션에서 지금 있어야 할 지점(초). 등장은 솟는 동안 첫 프레임에 멈춰 둠. */
const resolveClipSeconds = (state: SpaceBossState, elapsedSeconds: number): number => {
  if (state.phase === "spawn") {
    return Math.max(0, elapsedSeconds - SPACE_BOSS_SPAWN.riseSeconds);
  }

  return Math.max(0, elapsedSeconds);
};
// endregion

export const createBossAnimator = (model: BossModel): BossAnimator => {
  const mixer = new AnimationMixer(model.scene);
  const actions = new Map<BossClipKey, AnimationAction>();

  for (const [key, clip] of Object.entries(model.clips) as [
    BossClipKey,
    BossModel["clips"][BossClipKey],
  ][]) {
    const action = mixer.clipAction(clip);
    const isLooping = key === "idle" || key === "walk" || key === "run";

    action.setLoop(isLooping ? LoopRepeat : LoopOnce, isLooping ? Number.POSITIVE_INFINITY : 1);
    // 끝난 자세로 멈춰 둠. 다음 상태가 한 프레임 늦게 와도 기본 자세로 튀지 않음.
    action.clampWhenFinished = !isLooping && key !== "hit";
    actions.set(key, action);
  }

  const hitAction = actions.get("hit");

  if (hitAction) {
    hitAction.blendMode = AdditiveAnimationBlendMode;
  }

  let currentAction: AnimationAction | null = null;
  /** 지금 틀고 있는 상태의 지문. 바뀌면 모션을 새로 시작함. */
  let currentSignature = "";
  let shownHitAt: number | undefined;

  const startPhaseAction = (state: SpaceBossState, clipKey: BossClipKey): void => {
    const nextAction = actions.get(clipKey);

    if (!nextAction) {
      return;
    }

    const previousAction = currentAction;

    nextAction.reset();
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (previousAction && previousAction !== nextAction) {
      nextAction.crossFadeFrom(previousAction, resolveFadeSeconds(state.phase), false);
    }

    currentAction = nextAction;
  };

  const playHitReaction = (state: SpaceBossState, nowMs: number): void => {
    if (state.lastHitAt === undefined || state.lastHitAt === shownHitAt || !hitAction) {
      return;
    }

    const isTooSoon =
      shownHitAt !== undefined && state.lastHitAt - shownHitAt < SPACE_BOSS_HIT.minimumIntervalMs;
    // 오래된 피격(입장 때 받은 값 등)은 지금 움찔할 이유가 없음.
    const isStale = nowMs - state.lastHitAt > SPACE_BOSS_CLIP_SECONDS.hit * 1000;
    // 등장·처치·기절은 자체 모션이 커서 얹으면 지저분해짐.
    const isBusy = state.phase === "spawn" || state.phase === "dead" || state.phase === "stagger";

    if (isTooSoon) {
      return;
    }

    shownHitAt = state.lastHitAt;

    if (isStale || isBusy) {
      return;
    }

    hitAction.reset();
    hitAction.setEffectiveWeight(SPACE_BOSS_HIT.weight);
    hitAction.play();
  };

  const applyTransforms = (state: SpaceBossState, emergence: number): void => {
    const { floorY } = SPACE_BOSS.arena;
    const depth = state.phase === "dead" ? SPACE_BOSS_DEATH.sinkDepth : SPACE_BOSS_SPAWN.riseDepth;

    model.rig.position.set(state.x, floorY - (1 - emergence) * depth, state.z);
    model.rig.rotation.set(0, state.yaw + MODEL_YAW_OFFSET, 0);

    // 예고는 공격을 시작한 자리에 박아 둠. 공격 중에는 방향이 안 바뀌어 yaw 는 같이 씀.
    model.aoeAnchor.position.set(state.attackOriginX, floorY, state.attackOriginZ);
    model.aoeAnchor.rotation.set(0, state.yaw + MODEL_YAW_OFFSET, 0);
  };

  const update = (state: SpaceBossState, nowMs: number, deltaSeconds: number): number => {
    const clipKey = resolveClipKey(state);

    if (!clipKey) {
      model.scene.visible = false;
      if (currentAction) {
        mixer.stopAllAction();
        currentAction = null;
        currentSignature = "";
      }

      return 0;
    }

    model.scene.visible = true;

    const signature = `${state.phase}:${state.attack ?? ""}:${state.phaseStartedAt}`;

    if (signature !== currentSignature) {
      currentSignature = signature;
      startPhaseAction(state, clipKey);
    }

    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;

    if (currentAction) {
      if (LOOPING_PHASES.has(state.phase)) {
        currentAction.setEffectiveTimeScale(resolveTimeScale(state));
      } else if (!currentAction.paused) {
        // 믹서가 곧 `deltaSeconds` 만큼 밀어서 그만큼 앞에 둠. 밀고 나면 지금 시각과 맞음.
        currentAction.time = Math.max(0, resolveClipSeconds(state, elapsedSeconds) - deltaSeconds);
      }
    }

    playHitReaction(state, nowMs);
    mixer.update(deltaSeconds);

    const emergence = resolveEmergence(state, elapsedSeconds);

    applyTransforms(state, emergence);

    // 크기 0 인 예고는 그리지 않음. 켜 두면 안 보이는 메시 15개가 계속 드로우 콜을 먹음.
    for (const aoeRoot of model.aoeRoots) {
      aoeRoot.visible = aoeRoot.scale.x > 1e-4;
    }

    return emergence;
  };

  const dispose = (): void => {
    mixer.stopAllAction();
    mixer.uncacheRoot(model.scene);
  };

  return { update, dispose };
};
