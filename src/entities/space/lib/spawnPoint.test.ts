import { describe, expect, it } from "vitest";
import { createSpawnPoint } from "@/entities/space/lib/spawnPoint";
import {
  SPACE_BOUNDS,
  SPACE_SPAWN_RING,
  SPACE_WALL_ANCHOR,
} from "@/entities/space/model/spaceWorld";

const createClientKeys = (count: number): string[] => {
  return Array.from({ length: count }, (_, index) => `client-key-${index}`);
};

const distanceFromRingCenter = (x: number, z: number): number => {
  return Math.hypot(x - SPACE_SPAWN_RING.centerX, z - SPACE_SPAWN_RING.centerZ);
};

describe("createSpawnPoint", () => {
  it("같은 clientKey 는 항상 같은 좌표를 돌려준다", () => {
    expect(createSpawnPoint("macjjuni")).toEqual(createSpawnPoint("macjjuni"));
  });

  it("스폰 좌표는 링 반지름 범위 안에 있다", () => {
    for (const clientKey of createClientKeys(200)) {
      const { x, z } = createSpawnPoint(clientKey);
      const radius = distanceFromRingCenter(x, z);

      expect(radius).toBeGreaterThanOrEqual(SPACE_SPAWN_RING.minRadius - 1e-9);
      expect(radius).toBeLessThanOrEqual(SPACE_SPAWN_RING.maxRadius + 1e-9);
    }
  });

  it("스폰 좌표는 이동 경계 안에 있다", () => {
    for (const clientKey of createClientKeys(200)) {
      const { x, z } = createSpawnPoint(clientKey);

      expect(x).toBeGreaterThanOrEqual(SPACE_BOUNDS.minX);
      expect(x).toBeLessThanOrEqual(SPACE_BOUNDS.maxX);
      expect(z).toBeGreaterThanOrEqual(SPACE_BOUNDS.minZ);
      expect(z).toBeLessThanOrEqual(SPACE_BOUNDS.maxZ);
    }
  });

  it("서로 다른 키 50개가 모두 다른 좌표로 흩어진다", () => {
    const uniquePositions = new Set(
      createClientKeys(50).map((clientKey) => {
        const { x, z } = createSpawnPoint(clientKey);
        return `${x.toFixed(4)}:${z.toFixed(4)}`;
      }),
    );

    expect(uniquePositions.size).toBe(50);
  });

  it("스폰 직후 전광판을 바라본다", () => {
    const [billboardX, , billboardZ] = SPACE_WALL_ANCHOR;

    for (const clientKey of createClientKeys(50)) {
      const { x, z, yaw } = createSpawnPoint(clientKey);
      // 아바타 기본 전방은 -Z 이므로 yaw 회전 후 전방은 (-sin, -cos) 이다.
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const targetLength = Math.hypot(billboardX - x, billboardZ - z);

      expect(forwardX).toBeCloseTo((billboardX - x) / targetLength, 6);
      expect(forwardZ).toBeCloseTo((billboardZ - z) / targetLength, 6);
    }
  });

  it("면적 기준 분포라 안쪽 절반에 몰리지 않는다", () => {
    const { minRadius, maxRadius } = SPACE_SPAWN_RING;
    const midRadius = Math.sqrt((minRadius * minRadius + maxRadius * maxRadius) / 2);
    const innerCount = createClientKeys(400).filter((clientKey) => {
      const { x, z } = createSpawnPoint(clientKey);
      return distanceFromRingCenter(x, z) < midRadius;
    }).length;

    // 면적이 반씩 갈리는 반지름이므로 양쪽이 대략 절반씩 나와야 한다.
    expect(innerCount).toBeGreaterThan(150);
    expect(innerCount).toBeLessThan(250);
  });
});
