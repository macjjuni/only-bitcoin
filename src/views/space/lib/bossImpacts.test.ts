import { describe, expect, it } from "vitest";
import {
  createHiddenBossState,
  SPACE_BOSS_ATTACKS,
  type SpaceBossAttack,
  type SpaceBossState,
} from "@/entities/space";
import {
  BOSS_CHARGE_DUST_SPACING,
  BOSS_SLASH_LEAD_SECONDS,
  type BossImpact,
  createBossImpactTracker,
} from "./bossImpacts";

const FRAME_MS = 1000 / 60;

// region [Privates]
/** (10, 20) 에서 −X 를 보고 공격을 시작한 보스. */
const createAttackState = (attack: SpaceBossAttack, startedAt = 0): SpaceBossState => ({
  ...createHiddenBossState(),
  phase: "attack",
  attack,
  phaseStartedAt: startedAt,
  x: 10,
  z: 20,
  attackOriginX: 10,
  attackOriginZ: 20,
  yaw: Math.PI / 2,
});

/** `fromMs` 부터 `seconds` 동안 프레임마다 돌려 나온 연출을 시각과 함께 모음. */
const collect = (
  state: SpaceBossState,
  fromMs: number,
  seconds: number,
  frameMs = FRAME_MS,
): { atSeconds: number; impact: BossImpact }[] => {
  const tracker = createBossImpactTracker();
  const collected: { atSeconds: number; impact: BossImpact }[] = [];

  for (let nowMs = fromMs; nowMs <= fromMs + seconds * 1000; nowMs += frameMs) {
    for (const impact of tracker.step(state, nowMs)) {
      collected.push({ atSeconds: (nowMs - state.phaseStartedAt) / 1000, impact });
    }
  }

  return collected;
};
// endregion

describe("createBossImpactTracker", () => {
  it("내려찍기는 판정 시각에 예고 원 자리에서 충격파를 한 번 낸다", () => {
    const { hitSeconds, forwardOffset, radius } = SPACE_BOSS_ATTACKS.slam;
    const impacts = collect(createAttackState("slam"), 0, 3);

    expect(impacts).toHaveLength(1);
    expect(impacts[0].atSeconds).toBeGreaterThanOrEqual(hitSeconds);
    expect(impacts[0].atSeconds).toBeLessThan(hitSeconds + FRAME_MS / 1000 + 1e-6);
    expect(impacts[0].impact.kind).toBe("shockwave");
    expect(impacts[0].impact).toMatchObject({ radius, hasDebris: true });
    // −X 를 보고 있어 원 중심이 그쪽으로 `forwardOffset` 만큼 나가 있음.
    expect(impacts[0].impact.x).toBeCloseTo(10 - forwardOffset, 6);
    expect(impacts[0].impact.z).toBeCloseTo(20, 6);
  });

  it("회전은 돌기 시작할 때 발밑에서 예고 원만큼 퍼지는 고리를 한 번 낸다", () => {
    const { launchSeconds, radius } = SPACE_BOSS_ATTACKS.spin;
    const impacts = collect(createAttackState("spin"), 0, 3);

    expect(impacts).toHaveLength(1);
    expect(impacts[0].atSeconds).toBeGreaterThanOrEqual(launchSeconds);
    expect(impacts[0].atSeconds).toBeLessThan(launchSeconds + FRAME_MS / 1000 + 1e-6);
    expect(impacts[0].impact).toMatchObject({
      kind: "shockwave",
      x: 10,
      z: 20,
      radius,
      hasDebris: false,
    });
  });

  it("돌진은 박차는 고리, 길 따라 눈보라, 멈춰 서는 충격파 순으로 낸다", () => {
    const { launchSeconds, arriveSeconds, travel } = SPACE_BOSS_ATTACKS.charge;
    const impacts = collect(createAttackState("charge"), 0, 4);
    const shockwaves = impacts.filter(({ impact }) => impact.kind === "shockwave");
    const dustPuffs = impacts.filter(({ impact }) => impact.kind === "dust");

    expect(shockwaves).toHaveLength(2);
    expect(shockwaves[0].impact).toMatchObject({ x: 10, z: 20, hasDebris: false });
    expect(shockwaves[0].atSeconds).toBeGreaterThanOrEqual(launchSeconds);
    expect(shockwaves[1].impact).toMatchObject({ hasDebris: true });
    expect(shockwaves[1].impact.x).toBeCloseTo(10 - travel, 6);
    expect(shockwaves[1].atSeconds).toBeLessThanOrEqual(arriveSeconds + 0.1);

    expect(dustPuffs).toHaveLength(Math.floor(travel / BOSS_CHARGE_DUST_SPACING));
    dustPuffs.forEach(({ impact, atSeconds }, index) => {
      expect(impact.x).toBeCloseTo(10 - (index + 1) * BOSS_CHARGE_DUST_SPACING, 6);
      expect(impact.z).toBeCloseTo(20, 6);
      expect(atSeconds).toBeGreaterThan(launchSeconds);
    });
  });

  it("프레임이 크게 밀려도 지나간 구간의 눈보라를 빠뜨리지 않는다", () => {
    const { travel } = SPACE_BOSS_ATTACKS.charge;
    const impacts = collect(createAttackState("charge"), 0, 4, 250);

    expect(impacts.filter(({ impact }) => impact.kind === "dust")).toHaveLength(
      Math.floor(travel / BOSS_CHARGE_DUST_SPACING),
    );
    expect(impacts.filter(({ impact }) => impact.kind === "shockwave")).toHaveLength(2);
  });

  it("도중에 본 공격은 이미 지나간 충격을 뒤늦게 내지 않는다", () => {
    const afterHitMs = (SPACE_BOSS_ATTACKS.slam.hitSeconds + 0.2) * 1000;

    expect(collect(createAttackState("slam"), afterHitMs, 2)).toHaveLength(0);
  });

  it("휘두르기는 판정 직전에 보스 자리에서 보는 방향으로 할퀸 자국을 한 번 낸다", () => {
    const slashSeconds = SPACE_BOSS_ATTACKS.swipe.hitSeconds - BOSS_SLASH_LEAD_SECONDS;
    const impacts = collect(createAttackState("swipe"), 0, 3);

    expect(impacts).toHaveLength(1);
    expect(impacts[0].impact).toEqual({ kind: "slash", x: 10, z: 20, yaw: Math.PI / 2 });
    expect(impacts[0].atSeconds).toBeGreaterThanOrEqual(slashSeconds);
    expect(impacts[0].atSeconds).toBeLessThan(SPACE_BOSS_ATTACKS.swipe.hitSeconds);
  });

  it("공격이 아닌 상태에서는 아무것도 안 낸다", () => {
    expect(
      collect({ ...createAttackState("slam"), phase: "idle", attack: null }, 0, 3),
    ).toHaveLength(0);
  });

  it("같은 공격을 연달아 써도 시작 시각이 다르면 다시 낸다", () => {
    const tracker = createBossImpactTracker();
    const state = createAttackState("slam");
    let count = 0;

    for (const startedAt of [0, 5_000]) {
      state.phaseStartedAt = startedAt;
      for (let nowMs = startedAt; nowMs <= startedAt + 3_000; nowMs += FRAME_MS) {
        count += tracker.step(state, nowMs).length;
      }
    }

    expect(count).toBe(2);
  });
});
