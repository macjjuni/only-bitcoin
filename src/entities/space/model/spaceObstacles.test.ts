import { describe, expect, it } from "vitest";
import {
  resolveObstacleCollision,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_BOUNDS,
  SPACE_OBSTACLES,
  type SpaceObstacle,
} from "@/entities/space";

const createObstacle = (overrides: Partial<SpaceObstacle> = {}): SpaceObstacle => ({
  centerX: 0,
  centerZ: 0,
  halfWidth: 1,
  halfDepth: 1,
  top: 0.9,
  ...overrides,
});

describe("resolveObstacleCollision", () => {
  it("소품 밖의 위치는 그대로 둔다", () => {
    const resolved = resolveObstacleCollision(5, 5, 0, 0.28, [createObstacle()]);

    expect(resolved).toEqual({ x: 5, z: 5, blockedX: false, blockedZ: false });
  });

  it("얕게 겹친 축으로 밀어낸다", () => {
    // x 로 0.1 만, z 로 1.2 만큼 파고든 상태. 깊은 축으로 밀면 소품을 가로질러
    // 반대편으로 순간이동한다.
    const resolved = resolveObstacleCollision(1.18, 0.1, 0, 0.28, [createObstacle()]);

    expect(resolved.x).toBeCloseTo(1.28, 6);
    expect(resolved.z).toBe(0.1);
    expect(resolved.blockedX).toBe(true);
    expect(resolved.blockedZ).toBe(false);
  });

  it("반대편에서 들어오면 반대편으로 밀어낸다", () => {
    const resolved = resolveObstacleCollision(-1.18, 0.1, 0, 0.28, [createObstacle()]);

    expect(resolved.x).toBeCloseTo(-1.28, 6);
  });

  it("정면으로 들어오면 들어온 축으로 밀어낸다", () => {
    const resolved = resolveObstacleCollision(0.1, 1.2, 0, 0.28, [createObstacle()]);

    expect(resolved.z).toBeCloseTo(1.28, 6);
    expect(resolved.blockedZ).toBe(true);
  });

  it("중심이 정확히 겹쳐도 소품 밖으로 빼낸다", () => {
    // 스폰 좌표가 소품 중심과 일치할 수 있다. 부호가 0 이면 밀어낼 방향이 없다.
    const obstacle = createObstacle();
    const resolved = resolveObstacleCollision(0, 0, 0, 0.28, [obstacle]);
    const overlapX = obstacle.halfWidth + 0.28 - Math.abs(resolved.x - obstacle.centerX);
    const overlapZ = obstacle.halfDepth + 0.28 - Math.abs(resolved.z - obstacle.centerZ);

    expect(Math.min(overlapX, overlapZ)).toBeLessThanOrEqual(1e-9);
  });

  it("코너에서 두 소품에 겹치면 둘 다 해소한다", () => {
    const obstacles = [
      createObstacle({ centerX: 0, centerZ: 0 }),
      createObstacle({ centerX: 2.5, centerZ: 2.5 }),
    ];
    const resolved = resolveObstacleCollision(1.2, 1.2, 0, 0.28, obstacles);

    for (const obstacle of obstacles) {
      const overlapX = obstacle.halfWidth + 0.28 - Math.abs(resolved.x - obstacle.centerX);
      const overlapZ = obstacle.halfDepth + 0.28 - Math.abs(resolved.z - obstacle.centerZ);

      expect(Math.min(overlapX, overlapZ)).toBeLessThanOrEqual(1e-9);
    }
  });
});

describe("SPACE_OBSTACLES", () => {
  it("모든 소품이 닿을 수 있는 자리에 있다", () => {
    // 경계 밖에 완전히 빠진 사각형은 매 스텝 검사만 늘리고 막는 일은 하지 않는다.
    // 벽에 붙은 소품은 일부가 경계를 넘어가므로 "겹치는가" 로 본다.
    for (const obstacle of SPACE_OBSTACLES) {
      const overlapsX =
        obstacle.centerX + obstacle.halfWidth > SPACE_BOUNDS.minX &&
        obstacle.centerX - obstacle.halfWidth < SPACE_BOUNDS.maxX;
      const overlapsZ =
        obstacle.centerZ + obstacle.halfDepth > SPACE_BOUNDS.minZ &&
        obstacle.centerZ - obstacle.halfDepth < SPACE_BOUNDS.maxZ;

      expect(overlapsX && overlapsZ).toBe(true);
    }
  });

  it("소품끼리 아바타 지름보다 좁은 틈을 만들지 않는다", () => {
    // 한 번만 훑는 해소라 좁은 틈에서는 양쪽으로 번갈아 밀린다. 겹친 사각형은
    // 한 덩어리로 동작하니(선반 위 상자) 틈이 음수인 경우는 문제가 아니다.
    const diameter = SPACE_AVATAR_COLLISION_RADIUS * 2;

    for (const [index, left] of SPACE_OBSTACLES.entries()) {
      for (const right of SPACE_OBSTACLES.slice(index + 1)) {
        const gapX = Math.abs(left.centerX - right.centerX) - left.halfWidth - right.halfWidth;
        const gapZ = Math.abs(left.centerZ - right.centerZ) - left.halfDepth - right.halfDepth;
        const widestGap = Math.max(gapX, gapZ);

        expect(widestGap <= 0 || widestGap > diameter).toBe(true);
      }
    }
  });

  it("아바타가 지날 수 있는 통로가 중앙에 남는다", () => {
    // 스폰 링 중심(0, 0)에서 전광판까지 가는 길이 막히면 공간이 둘로 갈린다.
    const laneHalfWidth = SPACE_AVATAR_COLLISION_RADIUS + 0.1;
    const blockingObstacles = SPACE_OBSTACLES.filter((obstacle) => {
      return Math.abs(obstacle.centerX) - obstacle.halfWidth < laneHalfWidth;
    });

    // 라운지 테이블과 앞쪽 드럼통 하나만 중앙선에 걸린다. 둘 다 러그 안이고,
    // 좌우로 돌아갈 폭이 남는다.
    expect(blockingObstacles.length).toBeLessThanOrEqual(2);
  });
});
