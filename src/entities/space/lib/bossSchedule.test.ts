import { describe, expect, it } from "vitest";
import { SPACE_BOSS_SPAWN_INTERVAL_MS } from "@/entities/space/model/boss";
import {
  isBossPresent,
  resolveBossSlotStart,
  resolveBossSpawnedAt,
  resolveNextBossSpawnAt,
} from "./bossSchedule";

const HOUR_MS = 60 * 60 * 1_000;
/** 한국 시간 문자열을 ms 로. */
const kst = (text: string): number => Date.parse(`${text}+09:00`);

describe("보스 젠 시각", () => {
  it("칸은 한국 시간 짝수 정시에 시작한다", () => {
    expect(resolveBossSlotStart(kst("2026-11-13T13:25:00"))).toBe(kst("2026-11-13T12:00:00"));
    expect(resolveBossSlotStart(kst("2026-11-13T14:00:00"))).toBe(kst("2026-11-13T14:00:00"));
    expect(resolveBossSlotStart(kst("2026-11-13T00:59:59"))).toBe(kst("2026-11-13T00:00:00"));
    expect(resolveBossSlotStart(kst("2026-11-13T23:59:59"))).toBe(kst("2026-11-13T22:00:00"));
  });

  it("한 번도 안 잡았으면 보스가 있다", () => {
    const now = kst("2026-11-13T13:25:00");

    expect(isBossPresent(now, null)).toBe(true);
    expect(resolveBossSpawnedAt(now, null)).toBe(kst("2026-11-13T12:00:00"));
  });

  it("이번 칸에 잡았으면 다음 짝수 정시까지 없다", () => {
    const killedAt = kst("2026-11-13T12:40:00");

    expect(isBossPresent(kst("2026-11-13T12:40:00"), killedAt)).toBe(false);
    expect(isBossPresent(kst("2026-11-13T13:59:59"), killedAt)).toBe(false);
    expect(resolveBossSpawnedAt(kst("2026-11-13T13:00:00"), killedAt)).toBeNull();
    expect(isBossPresent(kst("2026-11-13T14:00:00"), killedAt)).toBe(true);
    expect(resolveNextBossSpawnAt(kst("2026-11-13T13:00:00"))).toBe(kst("2026-11-13T14:00:00"));
  });

  it("못 잡으면 여러 칸이 지나도 그대로 남고, 나타난 시각은 처치 다음 칸 시작이다", () => {
    const killedAt = kst("2026-11-13T12:40:00");
    const muchLater = kst("2026-11-13T21:10:00");

    expect(isBossPresent(muchLater, killedAt)).toBe(true);
    expect(resolveBossSpawnedAt(muchLater, killedAt)).toBe(kst("2026-11-13T14:00:00"));
  });

  it("칸 길이는 2시간이다", () => {
    expect(SPACE_BOSS_SPAWN_INTERVAL_MS).toBe(2 * HOUR_MS);
  });
});
