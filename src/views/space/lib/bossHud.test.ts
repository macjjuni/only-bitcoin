import { describe, expect, it } from "vitest";
import {
  resolveBossSlotStart,
  SPACE_BOSS_PLAYER,
  SPACE_BOSS_SPAWN_INTERVAL_MS,
} from "@/entities/space";
import {
  type BossHudInput,
  EMPTY_BOSS_HUD_VIEW,
  formatBossCountdown,
  isSameBossHudView,
  resolveBossHudView,
  resolveRaidZonePresence,
  resolveZoneBgmTrack,
  stepDisplayedHealth,
} from "./bossHud";

/** 서버 시각 − 로컬 시각. 로컬 0 이 서버의 한국 시간 13:25 임. */
const CLOCK_OFFSET_MS = Date.parse("2026-11-13T13:25:00+09:00");
const HALL = { x: 0 };
const COURTYARD = { x: 30 };

const createInput = (overrides: Partial<BossHudInput> = {}): BossHudInput => ({
  nowMs: 0,
  clockOffsetMs: CLOCK_OFFSET_MS,
  canFightBoss: true,
  bossPhase: "idle",
  selfPosition: HALL,
  selfHealth: SPACE_BOSS_PLAYER.maximumHealth,
  deadUntil: null,
  ...overrides,
});

describe("resolveBossHudView", () => {
  it("서버가 보스를 모르면 아무것도 안 띄운다", () => {
    const view = resolveBossHudView(
      createInput({ canFightBoss: false, selfPosition: COURTYARD, selfHealth: 10 }),
    );

    expect(view).toBe(EMPTY_BOSS_HUD_VIEW);
  });

  it("홀 안에서 멀쩡하면 아무것도 안 띄운다", () => {
    expect(resolveBossHudView(createInput())).toEqual(EMPTY_BOSS_HUD_VIEW);
  });

  it("안뜰에 나가면 내 체력바를 띄운다", () => {
    const view = resolveBossHudView(createInput({ selfPosition: COURTYARD }));

    expect(view.playerBar).toEqual({ ratio: 1, health: 100 });
    expect(view.nextSpawnSeconds).toBeNull();
  });

  it("다친 내 체력은 홀로 피해 있어도 보인다", () => {
    const view = resolveBossHudView(createInput({ selfHealth: 44.3 }));

    expect(view.playerBar?.health).toBe(45);
    expect(view.playerBar?.ratio).toBeCloseTo(0.443, 6);
  });

  it("쓰러져 있는 동안에는 남은 초를 올림으로 세고 내 체력바를 내린다", () => {
    const input = createInput({ selfPosition: HALL, selfHealth: 100, deadUntil: 3_000 });

    expect(resolveBossHudView({ ...input, nowMs: 0 }).knockoutSeconds).toBe(3);
    expect(resolveBossHudView({ ...input, nowMs: 2_001 }).knockoutSeconds).toBe(1);
    expect(resolveBossHudView({ ...input, nowMs: 2_001 }).playerBar).toBeNull();
    expect(resolveBossHudView({ ...input, nowMs: 3_000 }).knockoutSeconds).toBeNull();
  });

  it("보스가 없을 때 안뜰에 있으면 다음 젠까지 남은 시간을 띄운다", () => {
    const nextSpawnAt = resolveBossSlotStart(CLOCK_OFFSET_MS) + SPACE_BOSS_SPAWN_INTERVAL_MS;
    const input = createInput({ bossPhase: "hidden", selfPosition: COURTYARD });
    const view = resolveBossHudView(input);

    // 13:25 에서 14:00 까지 35분.
    expect(view.nextSpawnSeconds).toBe((nextSpawnAt - CLOCK_OFFSET_MS) / 1000);
    expect(view.nextSpawnSeconds).toBe(35 * 60);
    expect(view.playerBar).toBeNull();
    expect(resolveBossHudView({ ...input, selfPosition: HALL }).nextSpawnSeconds).toBeNull();
    expect(resolveBossHudView({ ...input, clockOffsetMs: null }).nextSpawnSeconds).toBeNull();
  });
});

describe("stepDisplayedHealth", () => {
  it("서버 값이 새로 오면 그 값으로 덮는다", () => {
    expect(stepDisplayedHealth(90, 45, true, HALL, 1)).toBe(45);
  });

  it("홀 안에서는 초당 10 씩 차고 가득에서 멈춘다", () => {
    expect(stepDisplayedHealth(45, 45, false, HALL, 0.2)).toBe(47);
    expect(stepDisplayedHealth(99, 45, false, HALL, 1)).toBe(SPACE_BOSS_PLAYER.maximumHealth);
  });

  it("안뜰에서는 안 찬다", () => {
    expect(stepDisplayedHealth(45, 45, false, COURTYARD, 5)).toBe(45);
    expect(stepDisplayedHealth(45, 45, false, null, 5)).toBe(45);
  });
});

describe("formatBossCountdown", () => {
  it("한 시간이 넘으면 시:분:초, 아니면 분:초로 적는다", () => {
    expect(formatBossCountdown(3_909)).toBe("1:05:09");
    expect(formatBossCountdown(309)).toBe("5:09");
    expect(formatBossCountdown(7)).toBe("0:07");
    expect(formatBossCountdown(-3)).toBe("0:00");
  });
});

describe("isSameBossHudView", () => {
  it("화면에 보이는 값이 같으면 같다고 본다", () => {
    const first = resolveBossHudView(createInput({ selfPosition: COURTYARD }));
    const same = resolveBossHudView(createInput({ selfPosition: { x: 31 } }));
    const hurt = resolveBossHudView(createInput({ selfPosition: COURTYARD, selfHealth: 80 }));

    expect(isSameBossHudView(first, same)).toBe(true);
    expect(isSameBossHudView(first, hurt)).toBe(false);
    expect(isSameBossHudView(first, EMPTY_BOSS_HUD_VIEW)).toBe(false);
  });
});

describe("resolveRaidZonePresence", () => {
  const { hallMaximumX } = SPACE_BOSS_PLAYER;

  it("안뜰에 나가면 참, 홀 안이면 거짓이다", () => {
    expect(resolveRaidZonePresence(false, true, COURTYARD)).toBe(true);
    expect(resolveRaidZonePresence(true, true, HALL)).toBe(false);
  });

  it("문턱에서는 앞선 판정을 유지한다", () => {
    const doorway = { x: hallMaximumX + 0.5 };

    expect(resolveRaidZonePresence(false, true, doorway)).toBe(false);
    expect(resolveRaidZonePresence(true, true, doorway)).toBe(true);
  });

  it("서버가 보스를 모르거나 접속 전이면 거짓이다", () => {
    expect(resolveRaidZonePresence(true, false, COURTYARD)).toBe(false);
    expect(resolveRaidZonePresence(true, true, null)).toBe(false);
  });
});

describe("resolveZoneBgmTrack", () => {
  it("홀 안이면 안뜰 곡을 안 튼다", () => {
    expect(resolveZoneBgmTrack(false, "idle")).toBeNull();
  });

  it("안뜰에서 보스가 떠 있으면 보스전 곡을 튼다", () => {
    expect(resolveZoneBgmTrack(true, "spawn")).toBe("raid");
    expect(resolveZoneBgmTrack(true, "attack")).toBe("raid");
  });

  it("보스가 없거나 쓰러졌으면 대기 곡을 튼다", () => {
    expect(resolveZoneBgmTrack(true, "hidden")).toBe("courtyard");
    expect(resolveZoneBgmTrack(true, "dead")).toBe("courtyard");
  });
});
