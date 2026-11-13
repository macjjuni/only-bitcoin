import { describe, expect, it, vi } from "vitest";
import {
  createFlatTerrain,
  createLocalPlayerState,
  type LocalPlayerState,
  type SpaceTerrain,
} from "@/entities/space";
import { createEmptyMovementInput, SPACE_MOVEMENT, stepMovement } from "./movement";
import {
  type SolidBody,
  SPACE_SEPARATION,
  SPACE_SOLID_BODY,
  separateFromPlayers,
  separateFromSolidBody,
} from "./separation";

const step = SPACE_MOVEMENT.fixedTimeStep;
const terrain = createFlatTerrain(0);
const createState = (x = 0, z = 0, y = 0): LocalPlayerState =>
  createLocalPlayerState({ x, y, z, yaw: 0 });
const settle = (
  state: LocalPlayerState,
  others: { x: number; y: number; z: number }[],
  seat = 0,
  usedTerrain: SpaceTerrain = terrain,
): LocalPlayerState => {
  let next = state;
  for (let index = 0; index < 120; index += 1) {
    next = separateFromPlayers(next, others, seat, step, usedTerrain);
  }
  return next;
};

describe("separateFromPlayers", () => {
  it("겹친 상대에게서 최소 거리까지 벌어지고 그 뒤로는 안 움직임", () => {
    const settled = settle(createState(0.2), [{ x: 0, y: 0, z: 0 }]);

    expect(settled.x).toBeGreaterThan(SPACE_SEPARATION.minimumDistance - 0.01);
    expect(settled.x).toBeLessThanOrEqual(SPACE_SEPARATION.minimumDistance);
    expect(settled.z).toBe(0);
    expect(separateFromPlayers(createState(1), [{ x: 0, y: 0, z: 0 }], 0, step, terrain).x).toBe(1);
  });

  it("한 스텝에 최대 속도보다 멀리 밀리지 않음", () => {
    const next = separateFromPlayers(createState(0.01), [{ x: 0, y: 0, z: 0 }], 0, step, terrain);

    expect(next.x - 0.01).toBeLessThanOrEqual(SPACE_SEPARATION.maximumSpeed * step + 1e-9);
    expect(next.x).toBeGreaterThan(0.01);
  });

  it("걸어서 다가가면 서 있는 상대를 밀고 지나갈 수 있음", () => {
    const input = { ...createEmptyMovementInput(), forward: 1 };
    let state = createState(0, 2);
    const startZ = state.z;
    // 전진이 어느 쪽이든 길 위에 한 명이 서 있게 앞뒤에 둠.
    const blockers = [
      { x: 0.05, y: 0, z: startZ - 2 },
      { x: 0.05, y: 0, z: startZ + 2 },
    ];
    let closest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < 180; index += 1) {
      state = stepMovement(state, input, 0, step, terrain);
      state = separateFromPlayers(state, blockers, 0, step, terrain);
      for (const blocker of blockers) {
        closest = Math.min(closest, Math.hypot(state.x - blocker.x, state.z - blocker.z));
      }
    }

    expect(Math.abs(state.z - startZ)).toBeGreaterThan(4);
    // 지나가면서도 한가운데를 뚫지는 않고 옆으로 비켜 감.
    expect(closest).toBeGreaterThan(0.2);
  });

  it("같은 자리에 서면 좌석마다 다른 쪽으로 비킴", () => {
    const others = [{ x: 0, y: 0, z: 0 }];
    const first = settle(createState(), others, 0);
    const second = settle(createState(), others, 1);

    expect(Math.hypot(first.x, first.z)).toBeGreaterThan(0.6);
    expect(Math.hypot(first.x - second.x, first.z - second.z)).toBeGreaterThan(0.5);
  });

  it("다른 층이나 점프 중인 상대는 건드리지 않음", () => {
    const state = createState(0.2);

    expect(separateFromPlayers(state, [{ x: 0, y: 1.5, z: 0 }], 0, step, terrain)).toBe(state);
  });

  it("양쪽에서 끼면 힘이 상쇄되고, 겹치지 않으면 지형을 묻지 않음", () => {
    const resolveMove = vi.spyOn(terrain, "resolveMove");
    const state = createState();

    expect(
      separateFromPlayers(
        state,
        [
          { x: 0.3, y: 0, z: 0 },
          { x: -0.3, y: 0, z: 0 },
        ],
        0,
        step,
        terrain,
      ),
    ).toBe(state);
    separateFromPlayers(state, [{ x: 5, y: 0, z: 0 }], 0, step, terrain);
    expect(resolveMove).not.toHaveBeenCalled();
    resolveMove.mockRestore();
  });

  it("벽 쪽으로 밀려도 벽을 넘지 않음", () => {
    const walled: SpaceTerrain = {
      ...createFlatTerrain(0),
      resolveMove: (x, z) => ({ x: Math.min(0.3, x), z, pushX: x > 0.3 ? -1 : 0, pushZ: 0 }),
    };
    const settled = settle(createState(0.2), [{ x: 0, y: 0, z: 0 }], 0, walled);

    expect(settled.x).toBeLessThanOrEqual(0.3);
  });
});

describe("separateFromSolidBody", () => {
  const body: SolidBody = { x: 0, y: 0, z: 0, radius: 1.6, height: 4.5 };
  const avatarRadius = 0.3;
  const minimumDistance = body.radius + avatarRadius;
  const settleSolid = (state: LocalPlayerState, usedTerrain: SpaceTerrain = terrain) => {
    let next = state;
    for (let index = 0; index < 120; index += 1) {
      next = separateFromSolidBody(next, body, avatarRadius, 0, step, usedTerrain);
    }
    return next;
  };

  it("몸통 안에 있으면 경계까지 밀려나고 그 뒤로는 안 움직임", () => {
    const settled = settleSolid(createState(0.5));

    expect(settled.x).toBeCloseTo(minimumDistance, 6);
    expect(settled.z).toBe(0);
    expect(separateFromSolidBody(settled, body, avatarRadius, 0, step, terrain)).toBe(settled);
  });

  it("한 스텝에 달리기 속도보다 멀리 밀리지 않음", () => {
    const next = separateFromSolidBody(createState(0.5), body, avatarRadius, 0, step, terrain);

    expect(next.x - 0.5).toBeCloseTo(SPACE_SOLID_BODY.maximumSpeed * step, 9);
  });

  it("전속력으로 달려 부딪혀도 뚫고 지나가지 못함", () => {
    const input = { ...createEmptyMovementInput(), forward: 1, isRunning: true };
    // 전진 방향을 먼저 알아냄. 그 반대편에서 출발해 몸통을 향해 달림.
    const probe = stepMovement(createState(), input, 0, undefined, terrain);
    const headingX = Math.sign(probe.velocityX) || 0;
    const headingZ = Math.sign(probe.velocityZ) || 0;
    let state = createState(-headingX * 6, -headingZ * 6);

    for (let index = 0; index < 600; index += 1) {
      state = stepMovement(state, input, 0, undefined, terrain);
      state = separateFromSolidBody(state, body, avatarRadius, 0, step, terrain);
    }

    // 속도가 붙은 한 스텝만큼은 파고들 수 있음. 그 이상은 못 들어감.
    expect(Math.hypot(state.x, state.z)).toBeGreaterThan(minimumDistance - 0.2);
    // 출발한 쪽에 그대로 있음.
    expect(state.x * headingX + state.z * headingZ).toBeLessThan(0);
  });

  it("한가운데에 겹쳐도 한쪽으로 빠져나옴", () => {
    const settled = settleSolid(createState(0, 0));

    expect(Math.hypot(settled.x, settled.z)).toBeCloseTo(minimumDistance, 6);
  });

  it("몸통보다 위에 있거나 몸통이 없으면 건드리지 않음", () => {
    const above = createState(0.5, 0, body.height + 0.1);
    const inside = createState(0.5);

    expect(separateFromSolidBody(above, body, avatarRadius, 0, step, terrain)).toBe(above);
    expect(separateFromSolidBody(inside, null, avatarRadius, 0, step, terrain)).toBe(inside);
  });

  it("벽 쪽으로 밀려도 벽을 넘지 않음", () => {
    const walled: SpaceTerrain = {
      ...createFlatTerrain(0),
      resolveMove: (x, z) => ({ x: Math.min(1, x), z, pushX: x > 1 ? -1 : 0, pushZ: 0 }),
    };

    expect(settleSolid(createState(0.5), walled).x).toBeLessThanOrEqual(1);
  });
});
