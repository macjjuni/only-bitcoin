import { describe, expect, it } from "vitest";
import {
  resolveBossSlotStart,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_SPAWN_INTERVAL_MS,
  type SpaceBossWire,
} from "@/entities/space";
import { createBossTracker } from "./bossTracker";

/** 서버 시각 − 로컬 시각. 로컬 0 이 서버의 한국 시간 13:25 임. */
const CLOCK_OFFSET_MS = Date.parse("2026-11-13T13:25:00+09:00");
const SLOT_STARTED_AT = resolveBossSlotStart(CLOCK_OFFSET_MS);
const { arena } = SPACE_BOSS;
const FRAME_MS = 1000 / 60;

// region [Privates]
const createWire = (overrides: Partial<SpaceBossWire> = {}): SpaceBossWire => ({
  phase: "run",
  attack: null,
  phaseStartedAt: CLOCK_OFFSET_MS,
  x: arena.centerX,
  z: arena.centerZ,
  yaw: 0,
  attackOriginX: arena.centerX,
  attackOriginZ: arena.centerZ,
  speed: 4,
  health: 2_500,
  maximumHealth: SPACE_BOSS_COMBAT.maximumHealth,
  targetSeat: 3,
  ...overrides,
});

const createEnabledTracker = (lastKilledAt: number | null = null, wire?: SpaceBossWire) => {
  const tracker = createBossTracker();

  tracker.reset({ lastKilledAt, wire, nowMs: 0 });

  return tracker;
};
// endregion

describe("쉬는 보스(젠 계산)", () => {
  it("서버가 보스를 모르거나 시계를 못 쟀으면 안 그린다", () => {
    const disabled = createBossTracker();
    const noClock = createEnabledTracker();

    disabled.reset(null);

    expect(disabled.sample(0, CLOCK_OFFSET_MS).phase).toBe("hidden");
    expect(noClock.sample(0, null).phase).toBe("hidden");
    expect(disabled.getHealth()).toBeNull();
  });

  it("한 번도 안 잡았으면 가운데 서 있고 체력은 가득이다", () => {
    const tracker = createEnabledTracker();
    const state = tracker.sample(0, CLOCK_OFFSET_MS);

    expect(state).toMatchObject({ phase: "idle", x: arena.centerX, z: arena.centerZ });
    expect(tracker.getHealth()).toEqual({
      health: SPACE_BOSS_COMBAT.maximumHealth,
      maximumHealth: SPACE_BOSS_COMBAT.maximumHealth,
    });
  });

  it("이번 칸에 잡았으면 없다가, 다음 젠 시각에 서버 프레임 없이 솟아오른다", () => {
    const tracker = createEnabledTracker(CLOCK_OFFSET_MS - 60_000);
    const nextSpawnLocal = SLOT_STARTED_AT + SPACE_BOSS_SPAWN_INTERVAL_MS - CLOCK_OFFSET_MS;

    expect(tracker.sample(0, CLOCK_OFFSET_MS).phase).toBe("hidden");
    expect(tracker.sample(nextSpawnLocal - 1, CLOCK_OFFSET_MS).phase).toBe("hidden");

    const spawning = tracker.sample(nextSpawnLocal + 500, CLOCK_OFFSET_MS);

    expect(spawning.phase).toBe("spawn");
    expect(spawning.phaseStartedAt).toBe(nextSpawnLocal);

    const standing = tracker.sample(
      nextSpawnLocal + SPACE_BOSS_SPAWN.totalSeconds * 1000 + 1,
      CLOCK_OFFSET_MS,
    );

    expect(standing.phase).toBe("idle");
  });

  it("시계 보정이 조금 바뀌어도 모션 시작 시각은 흔들리지 않는다", () => {
    const tracker = createEnabledTracker();
    const first = tracker.sample(0, CLOCK_OFFSET_MS).phaseStartedAt;
    const second = tracker.sample(FRAME_MS, CLOCK_OFFSET_MS + 37).phaseStartedAt;

    expect(second).toBe(first);
  });

  it("처치 소식을 받으면 다음 젠까지 없는 것으로 계산한다", () => {
    const tracker = createEnabledTracker();

    expect(tracker.sample(0, CLOCK_OFFSET_MS).phase).toBe("idle");

    tracker.applyDefeat(CLOCK_OFFSET_MS + 1_000);

    expect(tracker.sample(2_000, CLOCK_OFFSET_MS).phase).toBe("hidden");
  });
});

describe("싸우는 보스(서버 프레임)", () => {
  it("시작 시각을 로컬 축으로 옮긴다", () => {
    const tracker = createEnabledTracker();

    tracker.applyWire(createWire({ phaseStartedAt: CLOCK_OFFSET_MS + 250 }), 300);

    expect(tracker.sample(300, CLOCK_OFFSET_MS)).toMatchObject({
      phase: "run",
      phaseStartedAt: 250,
      speed: 4,
    });
    expect(tracker.getHealth()?.health).toBe(2_500);
  });

  it("10 Hz 로 오는 위치를 건너뛰지 않고 부드럽게 따라간다", () => {
    const tracker = createEnabledTracker();
    const positions: number[] = [];
    let nowMs = 0;

    tracker.applyWire(createWire(), nowMs);
    tracker.sample(nowMs, CLOCK_OFFSET_MS);

    // 서버가 0.1초마다 0.4 m 씩 +X 로 옮겨 보냄(4 m/s).
    for (let tick = 1; tick <= 10; tick += 1) {
      tracker.applyWire(createWire({ x: arena.centerX + tick * 0.4 }), nowMs);
      for (let frame = 0; frame < 6; frame += 1) {
        nowMs += FRAME_MS;
        positions.push(tracker.sample(nowMs, CLOCK_OFFSET_MS).x);
      }
    }

    const strides = positions.slice(1).map((x, index) => x - positions[index]);

    // 한 프레임에 한 틱 치(0.4 m)를 통째로 뛰지 않음.
    expect(Math.max(...strides)).toBeLessThan(0.2);
    expect(Math.min(...strides)).toBeGreaterThanOrEqual(0);
    // 뒤처지더라도 한 틱 치를 조금 넘는 정도임.
    expect(arena.centerX + 4 - (positions.at(-1) ?? 0)).toBeLessThan(0.5);
  });

  it("프레임이 늦게 몰려 와도 멈췄다 튀지 않고 직전 속도로 이어 그린다", () => {
    const tracker = createEnabledTracker();
    const positions: number[] = [];
    let nowMs = 0;
    let tick = 0;

    const applyTick = (): void => {
      tick += 1;
      tracker.applyWire(
        createWire({ x: arena.centerX + tick * 0.4 }),
        nowMs,
        CLOCK_OFFSET_MS + tick * 100,
      );
    };
    const sampleUntil = (untilMs: number): void => {
      while (nowMs + FRAME_MS <= untilMs) {
        nowMs += FRAME_MS;
        positions.push(tracker.sample(nowMs, CLOCK_OFFSET_MS).x);
      }
    };

    // 서버가 0.1초마다 0.4 m 씩 +X 로 옮김(4 m/s). 처음 두 틱은 제때 옴.
    nowMs = 100;
    applyTick();
    tracker.sample(nowMs, CLOCK_OFFSET_MS);
    sampleUntil(200);
    applyTick();
    positions.length = 0;
    // 다음 두 틱은 늦어져서 0.25초 뒤에 한꺼번에 옴.
    sampleUntil(450);
    applyTick();
    applyTick();
    sampleUntil(550);

    const strides = positions.slice(1).map((x, index) => x - positions[index]);

    // 프레임이 안 오는 동안에도 계속 나아가고, 몰려 왔을 때 한 번에 뛰지 않음.
    expect(Math.min(...strides)).toBeGreaterThan(0);
    expect(Math.max(...strides)).toBeLessThan(0.15);
    // 서버의 지금 위치(4 m/s × 0.55초) 근처에 있음.
    expect(Math.abs(arena.centerX + 2.2 - (positions.at(-1) ?? 0))).toBeLessThan(0.5);
  });

  it("회전 공격은 타깃을 따라 방향이 뒤집혀도 앞지르지 않고 프레임 사이만 잇는다", () => {
    const tracker = createEnabledTracker();
    const spin = { phase: "attack", attack: "spin" } as const;
    const positions: number[] = [];
    // 서버가 0.3 m 씩 갔다가 되돌아옴. 붙었다 떨어지는 타깃을 쫓는 모양임.
    const offsets = [0, 0.3, 0.6, 0.3, 0, 0.3, 0.6];
    let nowMs = 0;

    offsets.forEach((offset, tick) => {
      tracker.applyWire(
        createWire({ ...spin, x: arena.centerX + offset }),
        nowMs,
        CLOCK_OFFSET_MS + tick * 100,
      );
      for (let frame = 0; frame < 6; frame += 1) {
        nowMs += FRAME_MS;
        positions.push(tracker.sample(nowMs, CLOCK_OFFSET_MS).x);
      }
    });

    const strides = positions.slice(1).map((x, index) => Math.abs(x - positions[index]));

    // 서버가 보낸 범위를 벗어나지 않고, 한 프레임에 한 틱 치(0.3 m)를 통째로 뛰지 않음.
    expect(Math.max(...positions)).toBeLessThanOrEqual(arena.centerX + 0.6);
    expect(Math.min(...positions)).toBeGreaterThanOrEqual(arena.centerX);
    expect(Math.max(...strides)).toBeLessThan(0.1);
  });

  it("멀리 떨어진 자리로는 따라가지 않고 바로 옮긴다", () => {
    const tracker = createEnabledTracker();

    tracker.applyWire(createWire(), 0);
    tracker.sample(0, CLOCK_OFFSET_MS);
    tracker.applyWire(createWire({ x: arena.centerX + 8 }), 100);

    expect(tracker.sample(100 + FRAME_MS, CLOCK_OFFSET_MS).x).toBe(arena.centerX + 8);
  });

  it("돌진은 서버 틱을 기다리지 않고 이동표로 위치를 구한다", () => {
    const tracker = createEnabledTracker();
    const { launchSeconds, arriveSeconds, travel } = SPACE_BOSS_ATTACKS.charge;
    // yaw 가 반의 반 바퀴면 전방이 −X.
    const wire = createWire({
      phase: "attack",
      attack: "charge",
      yaw: Math.PI / 2,
      attackOriginX: arena.centerX + 4,
      x: arena.centerX + 4,
    });

    tracker.applyWire(wire, 0);

    expect(tracker.sample(launchSeconds * 1000, CLOCK_OFFSET_MS).x).toBeCloseTo(arena.centerX + 4);
    // 서버 프레임은 출발 때 것 그대로인데도 끝까지 나아감.
    expect(tracker.sample(arriveSeconds * 1000, CLOCK_OFFSET_MS).x).toBeCloseTo(
      arena.centerX + 4 - travel,
    );
    expect(tracker.state.attackOriginX).toBe(arena.centerX + 4);
  });

  it("맞으면 움찔 시각과 체력을 바로 반영한다", () => {
    const tracker = createEnabledTracker();

    tracker.applyWire(createWire(), 0);
    tracker.applyHit(2_490, 120);

    expect(tracker.sample(130, CLOCK_OFFSET_MS).lastHitAt).toBe(120);
    expect(tracker.getHealth()?.health).toBe(2_490);
  });

  it("쉬러 들어간 마지막 프레임을 받으면 젠 계산으로 돌아간다", () => {
    const tracker = createEnabledTracker();

    tracker.applyWire(createWire({ x: arena.centerX + 5 }), 0);
    expect(tracker.sample(0, CLOCK_OFFSET_MS).phase).toBe("run");

    tracker.applyWire(
      createWire({
        phase: "idle",
        speed: 0,
        targetSeat: null,
        health: SPACE_BOSS_COMBAT.maximumHealth,
      }),
      100,
    );

    expect(tracker.sample(100, CLOCK_OFFSET_MS)).toMatchObject({
      phase: "idle",
      x: arena.centerX,
      z: arena.centerZ,
    });
    expect(tracker.getHealth()?.health).toBe(SPACE_BOSS_COMBAT.maximumHealth);
  });

  it("프레임이 2초 넘게 끊기면 싸움 상태를 버린다", () => {
    const tracker = createEnabledTracker();

    tracker.applyWire(createWire({ x: arena.centerX + 5 }), 0);

    expect(tracker.sample(1_900, CLOCK_OFFSET_MS).phase).toBe("run");
    expect(tracker.sample(2_100, CLOCK_OFFSET_MS).phase).toBe("idle");
  });

  it("입장 응답에 싸움 상태가 실려 오면 바로 그 자리에 그린다", () => {
    const tracker = createEnabledTracker(null, createWire({ x: arena.centerX + 6, health: 1_200 }));

    expect(tracker.sample(0, CLOCK_OFFSET_MS)).toMatchObject({
      phase: "run",
      x: arena.centerX + 6,
    });
    expect(tracker.getHealth()?.health).toBe(1_200);
  });

  it("서버가 다시 나왔다고 알리면 처치 기록을 지우고 그 시각부터 솟아오른다", () => {
    const tracker = createEnabledTracker();

    tracker.applyDefeat(CLOCK_OFFSET_MS + 1_000);
    expect(tracker.sample(2_000, CLOCK_OFFSET_MS).phase).toBe("hidden");

    // 젠 시각이 아닌데 서버 시각 +9초에 다시 나옴(개발 서버).
    tracker.applySpawn(CLOCK_OFFSET_MS + 9_000);

    const spawning = tracker.sample(9_500, CLOCK_OFFSET_MS);

    expect(spawning.phase).toBe("spawn");
    expect(spawning.phaseStartedAt).toBe(9_000);
    expect(
      tracker.sample(9_000 + SPACE_BOSS_SPAWN.totalSeconds * 1000 + 1, CLOCK_OFFSET_MS).phase,
    ).toBe("idle");
    expect(tracker.getHealth()?.health).toBe(SPACE_BOSS_COMBAT.maximumHealth);

    // 다시 잡으면 또 사라짐.
    tracker.applyDefeat(CLOCK_OFFSET_MS + 20_000);
    expect(tracker.sample(21_000, CLOCK_OFFSET_MS).phase).toBe("hidden");
  });
});
