import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS, type SpaceAvatarClip } from "@/entities/space";
import {
  AVATAR_MOTION,
  type AvatarAnimation,
  type AvatarMotionInput,
  createAvatarAnimation,
  stepAvatarAnimation,
} from "./avatarAnimation";

const [model] = SPACE_AVATAR_MODELS;
const FRAME_SECONDS = 1 / 60;
const ATTACK_SECONDS = 0.55;

const createInput = (overrides: Partial<AvatarMotionInput> = {}): AvatarMotionInput => ({
  nowMs: 0,
  deltaSeconds: FRAME_SECONDS,
  speed: 0,
  isGrounded: true,
  attackStartedAt: undefined,
  attackSeconds: ATTACK_SECONDS,
  hitStartedAt: undefined,
  knockout: undefined,
  ...overrides,
});

/** `fromMs` 부터 `seconds` 동안 60 fps 로 돌림. 프레임마다 입력을 새로 받음. */
const run = (
  animation: AvatarAnimation,
  fromMs: number,
  seconds: number,
  resolveInput: (nowMs: number) => Partial<AvatarMotionInput>,
  onFrame?: (nowMs: number) => void,
): number => {
  let nowMs = fromMs;

  for (let frame = 0; frame < Math.round(seconds / FRAME_SECONDS); frame += 1) {
    nowMs += FRAME_SECONDS * 1000;
    stepAvatarAnimation(animation, createInput({ nowMs, ...resolveInput(nowMs) }), model);
    onFrame?.(nowMs);
  }

  return nowMs;
};

/** 줄 번호가 그 모션의 범위 안인지. */
const isRowInside = (row: number, clip: SpaceAvatarClip): boolean => {
  const { startFrame, frameCount } = model.clips[clip];

  return row >= startFrame && row <= startFrame + frameCount - 1;
};

describe("서기·걷기·달리기", () => {
  it("멈춰 있으면 서 있는 모션을 시간에 따라 돌린다", () => {
    const animation = createAvatarAnimation();
    const rows: number[] = [];

    run(
      animation,
      0,
      1,
      () => ({}),
      () => rows.push(animation.rowB),
    );

    expect(animation.clip).toBe("idle");
    expect(animation.blend).toBe(1);
    expect(rows.every((row) => isRowInside(row, "idle"))).toBe(true);
    expect(rows.at(-1)).toBeGreaterThan(rows[0]);
  });

  it("속도에 따라 걷기와 달리기를 고른다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.5, () => ({ speed: 4.5 }));
    expect(animation.clip).toBe("walk");

    run(animation, 500, 0.5, () => ({ speed: 8 }));
    expect(animation.clip).toBe("run");

    run(animation, 1_000, 0.5, () => ({ speed: 0 }));
    expect(animation.clip).toBe("idle");
  });

  it("걸은 거리만큼 사이클을 돌린다. 한 사이클 거리를 가면 처음으로 돌아온다", () => {
    const animation = createAvatarAnimation();
    const speed = 4.5;
    const cycleSeconds = AVATAR_MOTION.metersPerCycle.walk / speed;

    run(animation, 0, cycleSeconds / 2, () => ({ speed }));
    expect(animation.phase).toBeCloseTo(0.5, 1);

    run(animation, 0, cycleSeconds / 2, () => ({ speed }));
    expect(Math.min(animation.phase, 1 - animation.phase)).toBeLessThan(0.05);
  });

  it("걷다가 달리면 발 순서를 이어 간다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.3, () => ({ speed: 4.5 }));
    const walkPhase = animation.phase;

    stepAvatarAnimation(animation, createInput({ nowMs: 400, speed: 8 }), model);

    expect(animation.clip).toBe("run");
    expect(animation.phase).toBeGreaterThanOrEqual(walkPhase);
    expect(animation.phase - walkPhase).toBeLessThan(0.1);
  });

  it("공중에서는 속도가 있어도 다리를 멈춘다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.5, () => ({ speed: 8, isGrounded: false }));

    expect(animation.clip).toBe("idle");
  });

  it("모션을 바꾸면 이전 포즈에서 부드럽게 넘어온다", () => {
    const animation = createAvatarAnimation();
    const blends: number[] = [];

    run(animation, 0, 0.2, () => ({}));
    run(
      animation,
      200,
      AVATAR_MOTION.fadeSeconds.locomotion + 0.05,
      () => ({ speed: 4.5 }),
      () => {
        blends.push(animation.blend);
      },
    );

    expect(blends[0]).toBeLessThan(0.1);
    expect(blends.every((blend, index) => index === 0 || blend >= blends[index - 1])).toBe(true);
    expect(blends.at(-1)).toBe(1);
    // 다 넘어오면 두 줄이 같아져 한 포즈만 읽는 셈이 됨.
    expect(animation.rowA).toBe(animation.rowB);
  });

  it("넘어오는 동안 이전 줄은 이전 모션, 지금 줄은 새 모션 안에 있다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.2, () => ({}));
    stepAvatarAnimation(animation, createInput({ nowMs: 220, speed: 4.5 }), model);

    expect(isRowInside(animation.rowA, "idle")).toBe(true);
    expect(isRowInside(animation.rowB, "walk")).toBe(true);
  });
});

describe("공격과 피격", () => {
  it("공격은 정해진 시간에 맞춰 처음부터 끝까지 틀고 서 있는 모션으로 돌아온다", () => {
    const animation = createAvatarAnimation();
    const phases: number[] = [];

    run(
      animation,
      0,
      ATTACK_SECONDS - 0.02,
      () => ({ attackStartedAt: 0 }),
      () => {
        phases.push(animation.phase);
      },
    );

    expect(animation.clip).toBe("attack");
    expect(phases[0]).toBeLessThan(0.05);
    expect(phases.at(-1)).toBeGreaterThan(0.9);
    expect(isRowInside(animation.rowB, "attack")).toBe(true);

    run(animation, ATTACK_SECONDS * 1000, 0.5, () => ({ attackStartedAt: 0 }));
    expect(animation.clip).toBe("idle");
    expect(animation.blend).toBe(1);
  });

  it("달리면서 공격해도 공격 모션이 이긴다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.3, () => ({ speed: 8 }));
    run(animation, 300, 0.2, () => ({ speed: 8, attackStartedAt: 300 }));

    expect(animation.clip).toBe("attack");
  });

  it("같은 공격을 연달아 하면 처음부터 다시 튼다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.4, () => ({ attackStartedAt: 0 }));
    const lateRow = animation.rowB;

    stepAvatarAnimation(animation, createInput({ nowMs: 420, attackStartedAt: 410 }), model);

    expect(animation.rowB).toBeLessThan(lateRow);
  });

  it("맞으면 움찔하고, 휘두르다 맞으면 나중 것(피격)을 튼다", () => {
    const animation = createAvatarAnimation();

    run(animation, 0, 0.2, () => ({ attackStartedAt: 0 }));
    expect(animation.clip).toBe("attack");

    run(animation, 200, 0.2, () => ({ attackStartedAt: 0, hitStartedAt: 200 }));
    expect(animation.clip).toBe("hit");

    // 맞고 바로 휘두르면 휘두름.
    run(animation, 400, 0.1, () => ({ attackStartedAt: 400, hitStartedAt: 200 }));
    expect(animation.clip).toBe("attack");
  });

  it("오래 전 피격은 다시 틀지 않는다", () => {
    const animation = createAvatarAnimation();

    run(animation, 5_000, 0.2, () => ({ hitStartedAt: 0 }));

    expect(animation.clip).toBe("idle");
  });
});

describe("쓰러짐과 일어남", () => {
  const knockout = { startedAt: 1_000, until: 4_000 };
  // 일어나는 모션은 구간의 절반까지만 차지함. 3초면 1.5초씩 나눠 씀.
  const reviveStartedAt =
    knockout.until -
    Math.min(model.clips.revive.seconds * 1000, (knockout.until - knockout.startedAt) / 2);

  it("쓰러져 눕고, 다시 움직일 수 있는 시각에 맞춰 일어난다", () => {
    const animation = createAvatarAnimation();
    const clips: string[] = [];

    run(
      animation,
      1_000,
      3.2,
      () => ({ knockout, hitStartedAt: knockout.startedAt, speed: 3 }),
      () => {
        if (clips.at(-1) !== animation.clip) {
          clips.push(animation.clip);
        }
      },
    );

    // 맞은 시각이 같이 와도 쓰러짐이 먼저고, 일어난 뒤에야 걷기로 넘어감.
    expect(clips).toEqual(["death", "revive", "walk"]);
  });

  it("쓰러진 구간이 길면 다 쓰러진 뒤 누운 마지막 자세로 멈춰 있는다", () => {
    const animation = createAvatarAnimation();
    const { startFrame, frameCount } = model.clips.death;
    // 3초짜리는 쓰러지자마자 일어나기 시작함. 누워 있는 것을 보려고 길게 잡음.
    const long = { startedAt: 1_000, until: 7_000 };

    run(animation, 1_000, 3, () => ({ knockout: long }));

    expect(animation.clip).toBe("death");
    expect(animation.rowB).toBe(startFrame + frameCount - 1);
  });

  it("3초짜리는 일어나기 직전에 다 쓰러진다", () => {
    const animation = createAvatarAnimation();
    const { startFrame, frameCount } = model.clips.death;

    stepAvatarAnimation(animation, createInput({ nowMs: reviveStartedAt - 1, knockout }), model);

    expect(animation.clip).toBe("death");
    expect(animation.rowB).toBeCloseTo(startFrame + frameCount - 1, 0);
  });

  it("일어나는 모션은 다시 움직일 수 있는 시각에 끝난다", () => {
    const animation = createAvatarAnimation();
    const { startFrame, frameCount } = model.clips.revive;

    stepAvatarAnimation(animation, createInput({ nowMs: knockout.until - 1, knockout }), model);

    expect(animation.clip).toBe("revive");
    expect(animation.rowB).toBeCloseTo(startFrame + frameCount - 1, 0);
  });

  it("쓰러진 구간이 짧으면 절반씩 나눠 쓰러지고 일어난다", () => {
    const animation = createAvatarAnimation();
    const short = { startedAt: 0, until: 1_000 };

    stepAvatarAnimation(animation, createInput({ nowMs: 400, knockout: short }), model);
    expect(animation.clip).toBe("death");

    stepAvatarAnimation(animation, createInput({ nowMs: 600, knockout: short }), model);
    expect(animation.clip).toBe("revive");
  });
});
