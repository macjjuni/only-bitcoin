import { describe, expect, it } from "vitest";
import { SPACE_BOSS_COMBAT } from "../../../../src/entities/space/model/boss";
import { resolveBossMaximumHealth, resolveBossRespawnSeconds } from "./spaceBossConfig";

describe("resolveBossMaximumHealth", () => {
  it("값이 없으면 기본 체력을 쓴다", () => {
    expect(resolveBossMaximumHealth(undefined)).toBe(SPACE_BOSS_COMBAT.maximumHealth);
    expect(resolveBossMaximumHealth("")).toBe(SPACE_BOSS_COMBAT.maximumHealth);
    expect(resolveBossMaximumHealth("   ")).toBe(SPACE_BOSS_COMBAT.maximumHealth);
  });

  it("양수면 그 값을 쓴다", () => {
    expect(resolveBossMaximumHealth("1")).toBe(1);
    expect(resolveBossMaximumHealth(" 250 ")).toBe(250);
  });

  it("숫자가 아니거나 0 이하면 기본 체력을 쓴다", () => {
    for (const rawValue of ["abc", "0", "-5", "NaN", "Infinity"]) {
      expect(resolveBossMaximumHealth(rawValue), rawValue).toBe(SPACE_BOSS_COMBAT.maximumHealth);
    }
  });

  it("프로토콜이 받는 상한을 넘기지 않는다", () => {
    expect(resolveBossMaximumHealth("99999999999")).toBe(10_000_000);
  });
});

describe("resolveBossRespawnSeconds", () => {
  it("값이 없거나 잘못됐으면 꺼져 있다", () => {
    for (const rawValue of [undefined, "", "  ", "abc", "0", "-3", "NaN"]) {
      expect(resolveBossRespawnSeconds(rawValue), String(rawValue)).toBeNull();
    }
  });

  it("양수면 그 초를 쓰고 하루를 넘기지 않는다", () => {
    expect(resolveBossRespawnSeconds("10")).toBe(10);
    expect(resolveBossRespawnSeconds(" 2.5 ")).toBe(2.5);
    expect(resolveBossRespawnSeconds("999999999")).toBe(24 * 60 * 60);
  });
});
