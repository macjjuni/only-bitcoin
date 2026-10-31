import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_COLORS } from "../model/avatar";
import { hashClientKey, resolveColorIndexFromClientKey, toUnitFraction } from "./clientKeyHash";
import { createSpawnPoint } from "./spawnPoint";

const clientKey = (index: number): string => `client-key-${String(index).padStart(22, "0")}`;

describe("resolveColorIndexFromClientKey", () => {
  it("같은 키는 항상 같은 색을 준다", () => {
    expect(resolveColorIndexFromClientKey(clientKey(1))).toBe(
      resolveColorIndexFromClientKey(clientKey(1)),
    );
  });

  it("팔레트 범위와 프로토콜 검증 범위(0~255) 안에 든다", () => {
    for (let index = 0; index < 200; index += 1) {
      const colorIndex = resolveColorIndexFromClientKey(clientKey(index));

      expect(Number.isInteger(colorIndex)).toBe(true);
      expect(colorIndex).toBeGreaterThanOrEqual(0);
      expect(colorIndex).toBeLessThan(SPACE_AVATAR_COLORS.length);
    }
  });

  it("팔레트를 한쪽으로 몰지 않는다", () => {
    const usedColors = new Set(
      Array.from({ length: 200 }, (_, index) => resolveColorIndexFromClientKey(clientKey(index))),
    );

    expect(usedColors.size).toBe(SPACE_AVATAR_COLORS.length);
  });

  it("스폰 좌표와 상관되지 않는다", () => {
    // 같은 색을 받은 키들이 같은 방향으로 몰리면 시드가 분리되지 않은 것이다.
    const anglesByColor = new Map<number, number[]>();

    for (let index = 0; index < 400; index += 1) {
      const key = clientKey(index);
      const spawn = createSpawnPoint(key);
      const colorIndex = resolveColorIndexFromClientKey(key);
      const angles = anglesByColor.get(colorIndex) ?? [];
      angles.push(Math.atan2(spawn.z, spawn.x));
      anglesByColor.set(colorIndex, angles);
    }

    for (const angles of anglesByColor.values()) {
      const spread = Math.max(...angles) - Math.min(...angles);
      expect(spread).toBeGreaterThan(Math.PI);
    }
  });
});

describe("hashClientKey", () => {
  it("시드가 다르면 다른 해시를 준다", () => {
    expect(hashClientKey("key", 0)).not.toBe(hashClientKey("key", 1));
  });

  it("언제나 uint32 범위의 정수를 준다", () => {
    for (let index = 0; index < 100; index += 1) {
      const hash = hashClientKey(clientKey(index), index);

      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffff_ffff);
      expect(toUnitFraction(hash)).toBeLessThan(1);
    }
  });
});
