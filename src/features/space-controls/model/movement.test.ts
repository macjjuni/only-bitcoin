import { describe, expect, it } from "vitest";
import type { LocalPlayerState, SpaceTerrain, TerrainMoveResult } from "@/entities/space";
import {
  createFlatTerrain,
  createLocalPlayerState,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_BOUNDS,
  SPACE_HALL,
  SPACE_KICK,
  SPACE_STEP_HEIGHT,
} from "@/entities/space";
import {
  applyKnockback,
  createEmptyMovementInput,
  type MovementInput,
  planFixedSteps,
  SPACE_MOVEMENT,
  stepMovement,
} from "@/features/space-controls/model/movement";

/**
 * 해발 0 의 평지.
 *
 * `stepMovement` 의 기본 지형은 광장 높이(5 m)라 그대로 쓰면 모든 기대값에
 * 5 를 더해야 함. 이동·점프 적분 자체를 보는 테스트는 0 에서 재는 쪽이
 * 읽기 쉬움.
 */
const GROUND = createFlatTerrain(0);

interface Platform {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

/**
 * 해발 0 평지 위에 네모난 단 하나를 올린 지형.
 *
 * 실제 지형(`createIslandTerrain`)은 BVH 레이캐스트라 테스트에서 GLB 를 띄워야
 * 함. 적분기가 지형에 **무엇을 묻고 어떻게 쓰는지**만 보면 되므로, 같은
 * 규칙을 따르는 최소 구현을 세움 — 오를 수 있는 턱 이하는 막지 않고 올려
 * 주고, 그보다 높으면 벽처럼 밂.
 */
const createPlatformTerrain = (platform: Platform): SpaceTerrain => {
  const isOver = (x: number, z: number): boolean => {
    return x >= platform.minX && x <= platform.maxX && z >= platform.minZ && z <= platform.maxZ;
  };

  return {
    resolveGroundY: (x, z, feetY) => {
      const canStepUp = feetY + SPACE_STEP_HEIGHT >= platform.top;

      return isOver(x, z) && canStepUp ? platform.top : 0;
    },
    resolveMove: (x, z, feetY): TerrainMoveResult => {
      const radius = SPACE_AVATAR_COLLISION_RADIUS;

      if (feetY + SPACE_STEP_HEIGHT >= platform.top) {
        return { x, z, pushX: 0, pushZ: 0 };
      }

      const overlapX = Math.min(x - (platform.minX - radius), platform.maxX + radius - x);
      const overlapZ = Math.min(z - (platform.minZ - radius), platform.maxZ + radius - z);

      if (overlapX <= 0 || overlapZ <= 0) {
        return { x, z, pushX: 0, pushZ: 0 };
      }

      // 얕게 파고든 축으로 밂. 깊은 축으로 밀면 단을 가로질러 반대편에 섬.
      const centerX = (platform.minX + platform.maxX) / 2;
      const centerZ = (platform.minZ + platform.maxZ) / 2;

      if (overlapX < overlapZ) {
        const direction = x >= centerX ? 1 : -1;

        return {
          x: (direction > 0 ? platform.maxX : platform.minX) + direction * radius,
          z,
          pushX: direction,
          pushZ: 0,
        };
      }

      const direction = z >= centerZ ? 1 : -1;

      return {
        x,
        z: (direction > 0 ? platform.maxZ : platform.minZ) + direction * radius,
        pushX: 0,
        pushZ: direction,
      };
    },
    resolveCeilingY: () => Number.POSITIVE_INFINITY,
  };
};

const createState = (overrides: Partial<LocalPlayerState> = {}): LocalPlayerState => ({
  ...createLocalPlayerState({ x: 0, z: 0, y: 0, yaw: 0 }),
  ...overrides,
});

const createInput = (overrides: Partial<MovementInput> = {}): MovementInput => ({
  ...createEmptyMovementInput(),
  ...overrides,
});

/** 입력을 유지한 채 고정 타임스텝으로 여러 번 적분함. */
const runSteps = (
  state: LocalPlayerState,
  input: MovementInput,
  cameraYaw: number,
  stepCount: number,
  terrain: SpaceTerrain = GROUND,
): LocalPlayerState => {
  let current = state;

  for (let index = 0; index < stepCount; index += 1) {
    current = stepMovement(current, input, cameraYaw, undefined, terrain);
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

  it("바깥 상자를 넘지 않고 막힌 축의 속도가 0 이 된다", () => {
    const next = runSteps(
      createState({ z: SPACE_BOUNDS.minZ + 0.2 }),
      createInput({ forward: 1 }),
      0,
      60,
    );

    expect(next.z).toBe(SPACE_BOUNDS.minZ);
    expect(next.velocityZ).toBe(0);
  });

  it("상자에 막혀도 다른 축으로는 계속 움직인다", () => {
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
    const next = stepMovement(moving, createInput({ forward: 1 }), 0, undefined, GROUND);
    const deltaYaw = Math.abs(
      Math.atan2(Math.sin(next.yaw - moving.yaw), Math.cos(next.yaw - moving.yaw)),
    );

    expect(deltaYaw).toBeLessThanOrEqual(
      SPACE_MOVEMENT.maxYawRate * SPACE_MOVEMENT.fixedTimeStep + 1e-9,
    );
  });

  it("거의 멈춘 상태에서는 방향을 돌리지 않는다", () => {
    const almostStopped = createState({ yaw: 1.2, velocityX: 0.01, velocityZ: 0.01 });
    const next = stepMovement(almostStopped, createEmptyMovementInput(), 0, undefined, GROUND);

    expect(next.yaw).toBe(1.2);
  });

  it("지형을 넘기지 않으면 홀 바닥 높이의 평지로 본다", () => {
    // GLB 가 도착하기 전 한두 프레임이 이 경로를 탐. 0 으로 떨어뜨리면
    // 맵이 붙는 순간 홀 바닥으로 솟아오름.
    expect(stepMovement(createState(), createEmptyMovementInput(), 0).y).toBe(SPACE_HALL.floorY);
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
  /** 입력을 바꿔 가며 적분하고 매 스텝의 높이를 모음. */
  const runJump = (
    stepCount: number,
    isJumpingAt: (step: number) => boolean,
    terrain: SpaceTerrain = GROUND,
  ): number[] => {
    let current = createState();
    const heights: number[] = [];

    for (let index = 0; index < stepCount; index += 1) {
      current = stepMovement(
        current,
        createInput({ isJumping: isJumpingAt(index) }),
        0,
        undefined,
        terrain,
      );
      heights.push(current.y);
    }

    return heights;
  };

  it("서 있을 때는 바닥에 붙어 있다", () => {
    const heights = runJump(60, () => false);

    expect(Math.max(...heights)).toBe(0);
  });

  it("뛰면 올라갔다 정확히 바닥으로 돌아온다", () => {
    // 체공 2v/g = 0.75 초라 60 스텝(1초) 안에 착지가 끝남.
    const heights = runJump(60, (step) => step === 0);
    const apex = Math.max(...heights);

    expect(apex).toBeGreaterThan(0.9);
    expect(apex).toBeLessThan(1.2);
    expect(heights.at(-1)).toBe(0);
  });

  it("공중에서 다시 누르거나 떼도 궤적이 바뀌지 않는다", () => {
    // 중력만 받는 포물선이어야 함. 공중 조작을 허용하면 높이가 튐.
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

  it("천장에 닿으면 상승이 끊긴다", () => {
    // 궁전 안에서 뛰어 지붕 위로 빠져나가면 내려올 길이 없어 갇힘.
    const ceilingY = 0.4;
    const lowRoom: SpaceTerrain = { ...GROUND, resolveCeilingY: () => ceilingY };
    const heights = runJump(60, (step) => step === 0, lowRoom);

    expect(Math.max(...heights)).toBeCloseTo(ceilingY, 6);
    expect(heights.at(-1)).toBe(0);
  });
});

describe("지형 위 걷기", () => {
  /** 걸어서 오를 수 있는 턱. 맵의 계단 한 칸(0.25 m)을 대표함. */
  const STEP = createPlatformTerrain({ minX: 1, maxX: 10, minZ: -10, maxZ: 10, top: 0.25 });
  /** 점프로도 못 오르는 벽. */
  const WALL = createPlatformTerrain({ minX: 1, maxX: 10, minZ: -10, maxZ: 10, top: 3 });

  it("높은 지면에 서 있어도 접지로 본다", () => {
    // 걷기 모션이 이 값으로 다리를 멈춤. 전에는 `y <= 0` 으로 접지를 봤는데,
    // 섬은 광장이 5·테라스가 7.5·궁전이 11 이라 서 있어도 거짓이 되어
    // 걷기 모션이 통째로 멈춰 있었음.
    const plaza = createFlatTerrain(5);
    const next = runSteps(createState({ y: 5 }), createInput({ forward: 1 }), 0, 30, plaza);

    expect(next.y).toBe(5);
    expect(next.isGrounded).toBe(true);
  });

  it("공중에서는 접지가 풀린다", () => {
    const jumped = stepMovement(
      createState(),
      createInput({ isJumping: true }),
      0,
      undefined,
      GROUND,
    );

    expect(jumped.y).toBeGreaterThan(0);
    expect(jumped.isGrounded).toBe(false);
  });

  it("계단 한 칸은 걸어서 올라선다", () => {
    const next = runSteps(createState(), createInput({ strafe: 1 }), 0, 60, STEP);

    expect(next.x).toBeGreaterThan(1);
    expect(next.y).toBe(0.25);
  });

  it("오를 수 없는 벽에는 막히고 속도가 지워진다", () => {
    const next = runSteps(createState(), createInput({ strafe: 1 }), 0, 60, WALL);

    expect(next.x).toBeCloseTo(1 - SPACE_AVATAR_COLLISION_RADIUS, 6);
    expect(next.velocityX).toBe(0);
    expect(next.y).toBe(0);
  });

  it("벽을 비스듬히 밀면 벽을 따라 미끄러진다", () => {
    // 법선 성분만 지움. 둘 다 지우면 벽에 닿는 순간 그 자리에 섬.
    const next = runSteps(createState(), createInput({ forward: 1, strafe: 1 }), 0, 60, WALL);

    expect(next.x).toBeCloseTo(1 - SPACE_AVATAR_COLLISION_RADIUS, 6);
    expect(next.velocityX).toBe(0);
    expect(next.velocityZ).toBeLessThan(-SPACE_MOVEMENT.walkSpeed * 0.5);
  });

  it("지면이 없으면 수면 아래로 계속 떨어진다", () => {
    // `SpaceScene` 이 이 신호를 받아 스폰으로 되돌림. 여기서 바닥을
    // 만들어 주면 물 위에 서게 되고, 그게 소프트락의 원인이었음.
    const openWater: SpaceTerrain = {
      ...GROUND,
      resolveGroundY: () => Number.NEGATIVE_INFINITY,
    };
    const next = runSteps(createState(), createEmptyMovementInput(), 0, 60, openWater);

    expect(next.y).toBeLessThan(0);
    expect(next.velocityY).toBeLessThan(0);
  });

  it("평지 대체본은 지면 없는 자리를 만들지 않는다", () => {
    // 맵이 오기 전에 빠질 바다가 있으면 접속 직후 되돌려짐.
    expect(Number.isFinite(createFlatTerrain().resolveGroundY(999, 999, 0))).toBe(true);
  });

  it("단 가장자리를 벗어나면 아래 지면으로 떨어진다", () => {
    const onStep = createState({ x: 9.9, z: 0, y: 0.25 });
    const next = runSteps(onStep, createInput({ strafe: 1 }), 0, 60, STEP);

    expect(next.x).toBeGreaterThan(10);
    expect(next.y).toBe(0);
  });
});

describe("발차기 넉백", () => {
  it("맞으면 약 1 m 밀리고 살짝 떴다가 내려옴", () => {
    const hit = applyKnockback(createState(), 1, 0);
    let peakY = 0;
    let current = hit;

    for (let index = 0; index < 120; index += 1) {
      current = stepMovement(current, createInput(), 0, undefined, GROUND);
      peakY = Math.max(peakY, current.y);
    }

    expect(current.x).toBeGreaterThan(0.85);
    expect(current.x).toBeLessThan(1.05);
    expect(current.z).toBeCloseTo(0, 6);
    expect(peakY).toBeGreaterThan(0.1);
    expect(peakY).toBeLessThan(0.3);
    expect(current.y).toBe(0);
    expect(current.knockbackX).toBe(0);
  });

  it("세게 밀리는 동안만 조작을 무시하고 곧 다시 걸을 수 있음", () => {
    const forward = createInput({ forward: 1 });
    // 넉백은 +x, 입력은 화면 앞(-z).
    const staggered = stepMovement(
      applyKnockback(createState(), 1, 0),
      forward,
      0,
      undefined,
      GROUND,
    );

    expect(staggered.velocityZ).toBe(0);

    const recovered = runSteps(applyKnockback(createState(), 1, 0), forward, 0, 30);

    expect(recovered.velocityZ).toBeLessThan(-1);
  });

  it("밀리는 방향으로 몸을 돌리지 않음", () => {
    const hit = applyKnockback(createState({ yaw: 1.2 }), 1, 0);

    expect(runSteps(hit, createInput(), 0, 30).yaw).toBe(1.2);
  });

  it("벽으로 밀리면 벽 안쪽으로 파고들지 않음", () => {
    const wall = createPlatformTerrain({ minX: 0.6, maxX: 3, minZ: -3, maxZ: 3, top: 2 });
    const pushed = runSteps(applyKnockback(createState(), 1, 0), createInput(), 0, 120, wall);

    expect(pushed.x).toBeLessThanOrEqual(0.6 - SPACE_AVATAR_COLLISION_RADIUS + 1e-6);
  });

  it("방향이 0 이거나 숫자가 아니면 그대로 둠", () => {
    const state = createState();

    expect(applyKnockback(state, 0, 0)).toBe(state);
    expect(applyKnockback(state, Number.NaN, 1)).toBe(state);
  });

  it("밀리는 중에 또 맞으면 넉백이 더해지고 상한에서 잘림", () => {
    const once = applyKnockback(createState(), 1, 0);
    const twice = applyKnockback(once, 1, 0);
    const thrice = applyKnockback(twice, 1, 0);

    expect(twice.knockbackX).toBe(SPACE_KICK.knockbackMaxSpeed);
    expect(thrice.knockbackX).toBe(SPACE_KICK.knockbackMaxSpeed);
    // 양쪽에서 차면 상쇄됨.
    expect(applyKnockback(once, -1, 0).knockbackX).toBeCloseTo(0, 10);
  });

  it("세 명이 같은 방향으로 몰아 차면 혼자 맞을 때보다 멀리 밀림", () => {
    const alone = runSteps(applyKnockback(createState(), 1, 0), createInput(), 0, 120);
    let ganged = applyKnockback(createState(), 1, 0);
    ganged = applyKnockback(ganged, 0.8, 0.6);
    ganged = applyKnockback(ganged, 0.8, -0.6);

    expect(runSteps(ganged, createInput(), 0, 120).x).toBeGreaterThan(alone.x * 1.5);
  });

  describe("같은 순간 여러 명에게 맞을 때(다구리)", () => {
    /** 차는 사람 쪽에서 맞은 사람 쪽으로의 방향들을 같은 프레임에 모두 맞고 2초 적분함. */
    const settleAfterHits = (directions: readonly (readonly [number, number])[]) => {
      let state = createState();
      for (const [x, z] of directions) {
        state = applyKnockback(state, x, z);
      }
      const hit = state;
      let peakY = 0;
      for (let index = 0; index < 120; index += 1) {
        state = stepMovement(state, createInput(), 0, undefined, GROUND);
        peakY = Math.max(peakY, state.y);
      }
      return { hit, distance: Math.hypot(state.x, state.z), peakY };
    };
    const diagonal = Math.SQRT1_2;

    it.each([
      ["1명", [[1, 0]], 1],
      [
        "같은 쪽 2명",
        [
          [1, 0],
          [1, 0],
        ],
        2,
      ],
      [
        "같은 쪽 3명(상한)",
        [
          [1, 0],
          [1, 0],
          [1, 0],
        ],
        2,
      ],
      [
        "직각 2명",
        [
          [1, 0],
          [0, 1],
        ],
        Math.SQRT2,
      ],
      [
        "같은 쪽 2명 + 반대쪽 1명",
        [
          [1, 0],
          [1, 0],
          [-1, 0],
        ],
        1,
      ],
    ] as const)("%s → 약 %s 배 거리", (_label, directions, expectedMeters) => {
      const { distance } = settleAfterHits(directions);
      // 혼자 맞을 때 거리를 1 로 본 배율. 적분 오차 5% 안.
      const single = settleAfterHits([[1, 0]]).distance;

      expect(distance / single).toBeCloseTo(expectedMeters, 1);
    });

    it.each([
      [
        "마주 보고 2명",
        [
          [1, 0],
          [-1, 0],
        ],
      ],
      [
        "세 방향 고르게 3명",
        [
          [1, 0],
          [-0.5, Math.sqrt(3) / 2],
          [-0.5, -Math.sqrt(3) / 2],
        ],
      ],
    ] as const)("%s → 제자리, 살짝 뜨고 조작은 안 막힘", (_label, directions) => {
      const { hit, distance, peakY } = settleAfterHits(directions);

      expect(distance).toBeLessThan(0.01);
      expect(peakY).toBeGreaterThan(0.1);
      expect(Math.hypot(hit.knockbackX, hit.knockbackZ)).toBeLessThan(
        SPACE_KICK.knockbackControlResumeSpeed,
      );
    });

    it("몇 명이 몰아 차도 한 번만 뜸", () => {
      const once = settleAfterHits([[1, 0]]).peakY;
      const ganged = settleAfterHits([
        [1, 0],
        [diagonal, diagonal],
        [diagonal, -diagonal],
      ]).peakY;

      expect(ganged).toBeCloseTo(once, 5);
    });
  });

  it("공중에서 맞으면 수직 속도를 더하지 않음", () => {
    const airborne = createState({ y: 0.5, velocityY: -1, isGrounded: false });

    expect(applyKnockback(airborne, 0, 1).velocityY).toBe(-1);
    expect(Math.hypot(applyKnockback(airborne, 0, 1).knockbackZ)).toBe(SPACE_KICK.knockbackSpeed);
  });
});
