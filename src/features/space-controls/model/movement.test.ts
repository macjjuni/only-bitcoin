import { describe, expect, it } from "vitest";
import type { LocalPlayerState } from "@/entities/space";
import { createLocalPlayerState, SPACE_BOUNDS, SPACE_MAX_JUMP_HEIGHT } from "@/entities/space";
import {
  createEmptyMovementInput,
  type MovementInput,
  planFixedSteps,
  SPACE_MOVEMENT,
  stepMovement,
} from "@/features/space-controls/model/movement";

const createState = (overrides: Partial<LocalPlayerState> = {}): LocalPlayerState => ({
  ...createLocalPlayerState({ x: 0, z: 0, y: 0, yaw: 0 }),
  ...overrides,
});

const createInput = (overrides: Partial<MovementInput> = {}): MovementInput => ({
  ...createEmptyMovementInput(),
  ...overrides,
});

/** 입력을 유지한 채 고정 타임스텝으로 여러 번 적분한다. */
const runSteps = (
  state: LocalPlayerState,
  input: MovementInput,
  cameraYaw: number,
  stepCount: number,
): LocalPlayerState => {
  let current = state;

  for (let index = 0; index < stepCount; index += 1) {
    current = stepMovement(current, input, cameraYaw);
  }

  return current;
};

const speedOf = (state: LocalPlayerState): number => {
  return Math.hypot(state.velocityX, state.velocityZ);
};

describe("stepMovement", () => {
  it("카메라 yaw 가 0 이면 전진 입력은 -Z 로 간다", () => {
    const next = runSteps(createState(), createInput({ forward: 1 }), 0, 30);

    expect(next.z).toBeLessThan(0);
    expect(next.x).toBeCloseTo(0, 6);
  });

  it("카메라 yaw 가 90° 면 전진 입력은 -X 로 간다", () => {
    const next = runSteps(createState(), createInput({ forward: 1 }), Math.PI / 2, 30);

    expect(next.x).toBeLessThan(0);
    expect(next.z).toBeCloseTo(0, 6);
  });

  it("오른쪽 입력은 카메라 기준 +X 로 간다", () => {
    const next = runSteps(createState(), createInput({ strafe: 1 }), 0, 30);

    expect(next.x).toBeGreaterThan(0);
    expect(next.z).toBeCloseTo(0, 6);
  });

  it("대각 입력이 직진보다 빠르지 않다", () => {
    const straight = runSteps(createState(), createInput({ forward: 1 }), 0, 60);
    const diagonal = runSteps(createState(), createInput({ forward: 1, strafe: 1 }), 0, 60);

    expect(speedOf(diagonal)).toBeCloseTo(speedOf(straight), 6);
    expect(speedOf(diagonal)).toBeLessThanOrEqual(SPACE_MOVEMENT.walkSpeed + 1e-9);
  });

  it("걷기는 walkSpeed, 달리기는 runSpeed 로 수렴한다", () => {
    const walking = runSteps(createState(), createInput({ forward: 1 }), 0, 120);
    const running = runSteps(createState(), createInput({ forward: 1, isRunning: true }), 0, 120);

    expect(speedOf(walking)).toBeCloseTo(SPACE_MOVEMENT.walkSpeed, 4);
    expect(speedOf(running)).toBeCloseTo(SPACE_MOVEMENT.runSpeed, 4);
  });

  it("조이스틱 반쯤 기울이면 속력도 반이 된다", () => {
    const halfTilted = runSteps(createState(), createInput({ forward: 0.5 }), 0, 120);

    expect(speedOf(halfTilted)).toBeCloseTo(SPACE_MOVEMENT.walkSpeed * 0.5, 4);
  });

  it("입력이 없으면 감속해 멈춘다", () => {
    const moving = runSteps(createState(), createInput({ forward: 1 }), 0, 120);
    const stopped = runSteps(moving, createEmptyMovementInput(), 0, 60);

    expect(speedOf(stopped)).toBe(0);
  });

  it("이동 경계를 넘지 않고 막힌 축의 속도가 0 이 된다", () => {
    const next = runSteps(
      createState({ z: SPACE_BOUNDS.minZ + 0.2 }),
      createInput({ forward: 1 }),
      0,
      60,
    );

    expect(next.z).toBe(SPACE_BOUNDS.minZ);
    expect(next.velocityZ).toBe(0);
  });

  it("경계에 막혀도 다른 축으로는 계속 움직인다", () => {
    const next = runSteps(
      createState({ z: SPACE_BOUNDS.minZ }),
      createInput({ forward: 1, strafe: 1 }),
      0,
      60,
    );

    expect(next.z).toBe(SPACE_BOUNDS.minZ);
    expect(next.x).toBeGreaterThan(0);
  });

  it("캐릭터 회전은 maxYawRate 를 넘지 않는다", () => {
    const moving = createState({
      velocityX: 0,
      velocityZ: -SPACE_MOVEMENT.walkSpeed,
      yaw: Math.PI,
    });
    const next = stepMovement(moving, createInput({ forward: 1 }), 0);
    const deltaYaw = Math.abs(
      Math.atan2(Math.sin(next.yaw - moving.yaw), Math.cos(next.yaw - moving.yaw)),
    );

    expect(deltaYaw).toBeLessThanOrEqual(
      SPACE_MOVEMENT.maxYawRate * SPACE_MOVEMENT.fixedTimeStep + 1e-9,
    );
  });

  it("거의 멈춘 상태에서는 방향을 돌리지 않는다", () => {
    const almostStopped = createState({ yaw: 1.2, velocityX: 0.01, velocityZ: 0.01 });
    const next = stepMovement(almostStopped, createEmptyMovementInput(), 0);

    expect(next.yaw).toBe(1.2);
  });
});

describe("planFixedSteps", () => {
  it("타임스텝 미만이면 스텝 없이 잔여 시간만 남긴다", () => {
    const plan = planFixedSteps(SPACE_MOVEMENT.fixedTimeStep * 0.5);

    expect(plan.stepCount).toBe(0);
    expect(plan.remainder).toBeCloseTo(SPACE_MOVEMENT.fixedTimeStep * 0.5, 9);
  });

  it("누적 시간을 타임스텝 수로 쪼갠다", () => {
    const plan = planFixedSteps(SPACE_MOVEMENT.fixedTimeStep * 3.4);

    expect(plan.stepCount).toBe(3);
    expect(plan.remainder).toBeCloseTo(SPACE_MOVEMENT.fixedTimeStep * 0.4, 9);
  });

  it("긴 공백은 catch-up 상한까지만 처리하고 잔여를 버린다", () => {
    const plan = planFixedSteps(5);

    expect(plan.stepCount).toBe(SPACE_MOVEMENT.maxCatchUpSteps);
    expect(plan.remainder).toBe(0);
  });

  it("음수 누적은 스텝을 만들지 않는다", () => {
    expect(planFixedSteps(-1).stepCount).toBe(0);
  });
});

describe("점프", () => {
  /** 입력을 바꿔 가며 적분하고 매 스텝의 높이를 모은다. */
  const runJump = (stepCount: number, isJumpingAt: (step: number) => boolean): number[] => {
    let current = createState();
    const heights: number[] = [];

    for (let index = 0; index < stepCount; index += 1) {
      current = stepMovement(current, createInput({ isJumping: isJumpingAt(index) }), 0);
      heights.push(current.y);
    }

    return heights;
  };

  it("서 있을 때는 바닥에 붙어 있다", () => {
    const heights = runJump(60, () => false);

    expect(Math.max(...heights)).toBe(0);
  });

  it("뛰면 올라갔다 정확히 바닥으로 돌아온다", () => {
    // 체공 2v/g = 0.75 초라 60 스텝(1초) 안에 착지가 끝난다.
    const heights = runJump(60, (step) => step === 0);
    const apex = Math.max(...heights);

    expect(apex).toBeGreaterThan(0.9);
    // 서버가 검증하는 상한을 넘으면 이동이 거절된다.
    expect(apex).toBeLessThan(SPACE_MAX_JUMP_HEIGHT);
    expect(heights.at(-1)).toBe(0);
  });

  it("공중에서 다시 누르거나 떼도 궤적이 바뀌지 않는다", () => {
    // 중력만 받는 포물선이어야 한다. 공중 조작을 허용하면 높이가 튄다.
    const held = runJump(45, () => true);
    const tapped = runJump(45, (step) => step === 0);

    expect(held.slice(0, 40)).toEqual(tapped.slice(0, 40));
  });

  it("누르고 있으면 착지할 때마다 다시 뛴다", () => {
    const heights = runJump(120, () => true);
    const landings = heights.filter((height, index) => height === 0 && heights[index - 1] > 0);

    expect(landings.length).toBeGreaterThanOrEqual(1);
    expect(Math.max(...heights.slice(60))).toBeGreaterThan(0.9);
  });

  it("점프 중에도 수평 이동은 그대로 적분한다", () => {
    let current = createState();

    for (let index = 0; index < 20; index += 1) {
      current = stepMovement(current, createInput({ forward: 1, isJumping: index === 0 }), 0);
    }

    expect(current.y).toBeGreaterThan(0);
    expect(current.z).toBeLessThan(0);
  });
});
