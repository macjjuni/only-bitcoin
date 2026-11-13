import { describe, expect, it } from "vitest";
import {
  createFlatTerrain,
  createLocalPlayerState,
  type LocalPlayerState,
  type SpaceBossAttack,
  type SpaceTerrain,
} from "@/entities/space";
import {
  createBossKnockback,
  isKnockbackActive,
  SPACE_BOSS_KNOCKBACK,
  stepKnockback,
} from "./knockback";
import { SPACE_MOVEMENT } from "./movement";

const step = SPACE_MOVEMENT.fixedTimeStep;
const terrain = createFlatTerrain(0);
/** 서버가 받아 주는 이동 속도 상한(m/s). `SpaceRoom.ts` 의 값과 같아야 함. */
const SERVER_SPEED_LIMIT = 8.5;
/** 원점에서 −Z 를 보는 보스. */
const BOSS = { x: 0, z: 0, yaw: 0 };
const createState = (x: number, z: number): LocalPlayerState =>
  createLocalPlayerState({ x, y: 0, z, yaw: 0 });

/** 밀림이 끝날 때까지 돌리고 걸음마다의 이동 거리를 돌려줌. */
const runKnockback = (
  attack: SpaceBossAttack,
  from: LocalPlayerState,
  usedTerrain: SpaceTerrain = terrain,
) => {
  const knockback = createBossKnockback(attack, BOSS, from);
  const strides: number[] = [];
  let state = from;

  while (isKnockbackActive(knockback)) {
    const next = stepKnockback(state, knockback, step, usedTerrain);

    strides.push(Math.hypot(next.x - state.x, next.z - state.z));
    state = next;
  }

  return { state, strides, knockback };
};

describe("createBossKnockback", () => {
  it("휘두르기·내려찍기는 보스 반대쪽으로 민다", () => {
    const beside = createBossKnockback("swipe", BOSS, { x: 3, z: 0 });
    const diagonal = createBossKnockback("slam", BOSS, { x: -2, z: -2 });

    expect(beside).toMatchObject({ directionX: 1, directionZ: 0 });
    expect(diagonal.directionX).toBeCloseTo(-Math.SQRT1_2);
    expect(diagonal.directionZ).toBeCloseTo(-Math.SQRT1_2);
  });

  it("돌진은 옆에서 스쳐도 보스가 달리는 방향으로 민다", () => {
    const grazed = createBossKnockback("charge", BOSS, { x: 1.2, z: -4 });

    expect(grazed.directionX).toBeCloseTo(0);
    expect(grazed.directionZ).toBeCloseTo(-1);
  });

  it("보스와 같은 자리면 보스가 보는 쪽으로 민다", () => {
    const stacked = createBossKnockback("swipe", { x: 5, z: 5, yaw: Math.PI / 2 }, { x: 5, z: 5 });

    expect(stacked.directionX).toBeCloseTo(-1);
    expect(stacked.directionZ).toBeCloseTo(0);
  });
});

describe("stepKnockback", () => {
  it.each([
    ["swipe", 1.0],
    ["slam", 1.6],
    ["spin", 2.0],
    ["charge", 3.0],
  ] as const)("%s 은 %f m 밀린다", (attack, meters) => {
    const { state } = runKnockback(attack, createState(0, -2));

    expect(state.x).toBeCloseTo(0, 6);
    expect(-2 - state.z).toBeCloseTo(meters, 2);
  });

  it("돌진이 가장 멀리, 휘두르기가 가장 짧게 밀린다", () => {
    const distances = (["swipe", "slam", "charge"] as const).map(
      (attack) => -2 - runKnockback(attack, createState(0, -2)).state.z,
    );

    expect(distances[0]).toBeLessThan(distances[1]);
    expect(distances[1]).toBeLessThan(distances[2]);
  });

  it("어느 걸음에서도 서버의 이동 속도 상한을 넘지 않는다", () => {
    for (const attack of Object.keys(SPACE_BOSS_KNOCKBACK) as SpaceBossAttack[]) {
      const { strides } = runKnockback(attack, createState(0, -2));

      expect(Math.max(...strides) / step).toBeLessThan(SERVER_SPEED_LIMIT);
    }
  });

  it("처음에 세게 밀리고 점점 느려진다", () => {
    const { strides } = runKnockback("charge", createState(0, -2));

    expect(strides.every((stride, index) => index === 0 || stride <= strides[index - 1])).toBe(
      true,
    );
    expect(strides[0]).toBeGreaterThan((strides.at(-1) ?? 0) * 10);
  });

  it("끝난 뒤에는 더 밀리지 않는다", () => {
    const { state, knockback } = runKnockback("slam", createState(0, -2));

    expect(isKnockbackActive(knockback)).toBe(false);
    expect(stepKnockback(state, knockback, step, terrain)).toBe(state);
    expect(isKnockbackActive(null)).toBe(false);
  });

  it("벽 쪽으로 밀려도 벽을 넘지 않는다", () => {
    const walled: SpaceTerrain = {
      ...createFlatTerrain(0),
      resolveMove: (x, z) => ({ x, z: Math.max(-3, z), pushX: 0, pushZ: z < -3 ? 1 : 0 }),
    };

    expect(runKnockback("charge", createState(0, -2), walled).state.z).toBe(-3);
  });
});
