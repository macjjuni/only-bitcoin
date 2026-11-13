import { describe, expect, it } from "vitest";
import {
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_SPAWN,
} from "@/entities/space/model/boss";
import {
  type BossPlayerHit,
  type BossSimulation,
  type BossSimulationPlayer,
  createBossSimulation,
} from "./bossSimulation";

/** 서버 틱과 같은 간격. */
const TICK_SECONDS = 0.1;
const TICK_MS = 100;
const { arena } = SPACE_BOSS;
/** 등장이 끝난 뒤에서 시작하려고 넉넉히 과거로 잡음. */
const SPAWNED_AT = -60_000;

interface RunOptions {
  simulation: BossSimulation;
  fromMs: number;
  seconds: number;
  players: (nowMs: number) => BossSimulationPlayer[];
  onTick?: (nowMs: number, hits: BossPlayerHit[]) => void;
}

// region [Privates]
/** 아레나 중심 기준 좌표에 선 유저. 기본은 방금 움직였고 살아 있음. */
const createPlayer = (
  seat: number,
  offsetX: number,
  offsetZ: number,
  nowMs: number,
  overrides: Partial<BossSimulationPlayer> = {},
): BossSimulationPlayer => ({
  seat,
  // 좌석마다 다른 사람. 같은 사람이 좌석을 바꾼 경우는 `actorKey` 를 따로 넘김.
  actorKey: `actor-${seat}`,
  x: arena.centerX + offsetX,
  y: arena.floorY,
  z: arena.centerZ + offsetZ,
  yaw: 0,
  lastInputAt: nowMs,
  isAlive: true,
  ...overrides,
});

/** 보스 쪽을 보게 돌린 유저. 공격이 닿으려면 마주 봐야 함. */
const facingBoss = (
  player: BossSimulationPlayer,
  simulation: BossSimulation,
): BossSimulationPlayer => ({
  ...player,
  yaw: Math.atan2(-(simulation.state.x - player.x), -(simulation.state.z - player.z)),
});

const run = ({ simulation, fromMs, seconds, players, onTick }: RunOptions): number => {
  let nowMs = fromMs;

  for (let tick = 0; tick < Math.round(seconds / TICK_SECONDS); tick += 1) {
    nowMs += TICK_MS;
    const { hits } = simulation.step(nowMs, TICK_SECONDS, players(nowMs));

    onTick?.(nowMs, hits);
  }

  return nowMs;
};

const createSpawnedSimulation = (maximumHealth?: number): BossSimulation => {
  const simulation = createBossSimulation(maximumHealth);

  simulation.spawn(SPAWNED_AT);

  return simulation;
};
// endregion

describe("쉬는 상태", () => {
  it("없을 때와, 아무도 없이 가운데 서 있을 때는 틱이 필요 없다", () => {
    const simulation = createBossSimulation();

    expect(simulation.isResting()).toBe(true);

    simulation.spawn(SPAWNED_AT);
    run({ simulation, fromMs: 0, seconds: 1, players: () => [] });

    expect(simulation.state.phase).toBe("idle");
    expect(simulation.isResting()).toBe(true);
  });

  it("아레나에 누가 들어오면 깨어나고, 나가면 걸어 돌아와 다시 쉰다", () => {
    const simulation = createSpawnedSimulation();
    const phases = new Set<string>();
    let nowMs = run({
      simulation,
      fromMs: 0,
      seconds: 6,
      players: (now) => [createPlayer(1, -8, 0, now)],
    });

    expect(simulation.isResting()).toBe(false);
    expect(simulation.getTargetSeat()).toBe(1);

    nowMs = run({
      simulation,
      fromMs: nowMs,
      seconds: 40,
      players: () => [],
      onTick: () => phases.add(simulation.state.phase),
    });

    expect(phases.has("walk")).toBe(true);
    expect(simulation.state.phase).toBe("idle");
    expect(simulation.isResting()).toBe(true);
    expect(simulation.getTargetSeat()).toBeNull();
    expect(nowMs).toBeGreaterThan(0);
  });

  it("발코니처럼 높이가 다른 곳에 선 사람은 대상이 아니다", () => {
    const simulation = createSpawnedSimulation();

    run({
      simulation,
      fromMs: 0,
      seconds: 3,
      players: (now) => [createPlayer(1, -3, 0, now, { y: arena.floorY + 4 })],
    });

    expect(simulation.isResting()).toBe(true);
  });
});

describe("어그로", () => {
  it("아무도 안 때렸으면 먼저 들어온 사람을 쫓는다", () => {
    const simulation = createSpawnedSimulation();
    const nowMs = run({
      simulation,
      fromMs: 0,
      seconds: 1,
      players: (now) => [createPlayer(3, 9, 0, now)],
    });

    run({
      simulation,
      fromMs: nowMs,
      seconds: 3,
      players: (now) => [createPlayer(3, 9, 0, now), createPlayer(7, -9, 0, now)],
    });

    expect(simulation.getTargetSeat()).toBe(3);
  });

  it("더 많이 때린 사람으로 타깃을 바꾼다", () => {
    const simulation = createSpawnedSimulation();
    const players = (now: number) => [createPlayer(3, 9, 0, now), createPlayer(7, 0, 2.5, now)];
    const nowMs = run({ simulation, fromMs: 0, seconds: 1, players });

    expect(simulation.getTargetSeat()).toBe(3);

    const attacker = facingBoss(players(nowMs)[1], simulation);

    expect(simulation.applyKick(nowMs, attacker)?.damage).toBe(SPACE_BOSS_COMBAT.kickDamage);
    // 하던 동작(돌기·공격)은 끝까지 하고 나서 다시 고름.
    run({ simulation, fromMs: nowMs, seconds: 6, players });

    expect(simulation.getTargetSeat()).toBe(7);
  });

  it("10초 넘게 입력이 없는 사람은 타깃에서 뺀다", () => {
    const simulation = createSpawnedSimulation();
    const players = (now: number) => [
      createPlayer(3, 9, 0, now, { lastInputAt: 0 }),
      createPlayer(7, -9, 0, now),
    ];

    run({ simulation, fromMs: 0, seconds: 2, players });
    expect(simulation.getTargetSeat()).toBe(3);

    run({
      simulation,
      fromMs: SPACE_BOSS_COMBAT.awayTimeoutMs,
      seconds: 2,
      players,
    });
    expect(simulation.getTargetSeat()).toBe(7);
  });

  it("쓰러진 사람은 쫓지도 때리지도 않는다", () => {
    const simulation = createSpawnedSimulation();
    const hitSeats = new Set<number>();

    run({
      simulation,
      fromMs: 0,
      seconds: 20,
      players: (now) => [createPlayer(3, 0, 2.5, now, { isAlive: false })],
      onTick: (_, hits) => {
        for (const hit of hits) {
          hitSeats.add(hit.seat);
        }
      },
    });

    expect(simulation.getTargetSeat()).toBeNull();
    expect(hitSeats.size).toBe(0);
  });
});

describe("보스 공격 판정", () => {
  it("가까이 선 사람은 예고가 다 찬 시각에 한 번 맞는다", () => {
    const simulation = createSpawnedSimulation();
    const hits: { attack: string; afterSeconds: number }[] = [];

    run({
      simulation,
      fromMs: 0,
      seconds: 12,
      // 보스가 처음 보는 방향(−X) 바로 앞 2.5 m.
      players: (now) => [createPlayer(1, -2.5, 0, now)],
      onTick: (nowMs, tickHits) => {
        for (const hit of tickHits) {
          hits.push({
            attack: hit.attack,
            afterSeconds: (nowMs - simulation.state.phaseStartedAt) / 1000,
          });
        }
      },
    });

    const first = hits[0];

    expect(first.attack).toBe("swipe");
    expect(first.afterSeconds).toBeGreaterThanOrEqual(SPACE_BOSS_ATTACKS.swipe.hitSeconds);
    expect(first.afterSeconds).toBeLessThan(SPACE_BOSS_ATTACKS.swipe.hitSeconds + TICK_SECONDS);
    // 가까이서는 휘두르기와 내려찍기를 번갈아 씀.
    expect(hits[1].attack).toBe("slam");
  });

  it("싸우는 자리 바로 위층에 선 사람은 안 맞는다", () => {
    const simulation = createSpawnedSimulation();
    const hitSeats = new Set<number>();

    run({
      simulation,
      fromMs: 0,
      seconds: 12,
      // 한 사람은 보스 앞 바닥에, 한 사람은 같은 자리 위 발코니에 섬.
      players: (now) => [
        createPlayer(1, -2.5, 0, now),
        createPlayer(2, -2.5, 0, now, { y: arena.floorY + 4 }),
      ],
      onTick: (_, tickHits) => {
        for (const hit of tickHits) {
          hitSeats.add(hit.seat);
        }
      },
    });

    expect(hitSeats).toEqual(new Set([1]));
  });

  it("판정 시각 전에 범위를 벗어나면 안 맞는다", () => {
    const simulation = createSpawnedSimulation();
    let hitCount = 0;

    run({
      simulation,
      fromMs: 0,
      seconds: 4,
      players: (now) => {
        const isWindingUp = simulation.state.phase === "attack";

        // 공격이 시작되면 뒤로 빠짐. 아레나 안이지만 부채꼴 밖.
        return [createPlayer(1, isWindingUp ? -6 : -2.5, 0, now)];
      },
      onTick: (_, hits) => {
        hitCount += hits.length;
      },
    });

    expect(hitCount).toBe(0);
  });

  it("돌진은 길 위에 선 사람을 한 번만 치고 보스는 9 m 나아간다", () => {
    const simulation = createSpawnedSimulation();
    const chargeHits: number[] = [];
    let startX = Number.NaN;
    let endX = Number.NaN;

    run({
      simulation,
      fromMs: 0,
      seconds: 9,
      players: (now) => [createPlayer(1, -8, 0, now)],
      onTick: (_, hits) => {
        if (simulation.state.attack === "charge") {
          startX = simulation.state.attackOriginX;
          endX = simulation.state.x;
        }
        for (const hit of hits) {
          if (hit.attack === "charge") {
            chargeHits.push(hit.seat);
          }
        }
      },
    });

    expect(chargeHits).toEqual([1]);
    expect(startX - endX).toBeCloseTo(SPACE_BOSS_ATTACKS.charge.travel, 3);
    expect(Math.hypot(endX - arena.centerX, simulation.state.z - arena.centerZ)).toBeLessThan(
      arena.radius,
    );
  });

  it("내려찍기 원 안에 둘 이상 모이면 내려찍는다", () => {
    const simulation = createSpawnedSimulation();
    const attacks: string[] = [];

    run({
      simulation,
      fromMs: 0,
      seconds: 5,
      players: (now) => [createPlayer(1, -2.5, 0.5, now), createPlayer(2, -2.5, -0.5, now)],
      onTick: () => {
        if (simulation.state.attack && attacks.at(-1) !== simulation.state.attack) {
          attacks.push(simulation.state.attack);
        }
      },
    });

    expect(attacks[0]).toBe("slam");
  });
});

describe("유저 공격", () => {
  it("등장 중에는 맞지 않고, 무적이 끝나면 맞는다", () => {
    const simulation = createBossSimulation();
    const attacker = (now: number) => facingBoss(createPlayer(1, 2, 0, now), simulation);

    simulation.spawn(0);

    expect(simulation.applyKick(1_000, attacker(1_000))).toBeNull();

    const afterMs = SPACE_BOSS_SPAWN.invulnerableSeconds * 1000 + 1;

    expect(simulation.applyKick(afterMs, attacker(afterMs))?.damage).toBe(
      SPACE_BOSS_COMBAT.kickDamage,
    );
  });

  it("위층에서는 바로 아래 보스를 못 때린다", () => {
    const simulation = createSpawnedSimulation();
    const below = facingBoss(createPlayer(1, 2, 0, 0), simulation);
    const above = { ...below, y: arena.floorY + 4 };

    expect(simulation.applyKick(0, above)).toBeNull();
    expect(simulation.applyKick(0, below)).not.toBeNull();
  });

  it("멀거나 등지면 안 닿는다", () => {
    const simulation = createSpawnedSimulation();
    const far = facingBoss(createPlayer(1, 6, 0, 0), simulation);
    const turnedAway = { ...facingBoss(createPlayer(1, 2, 0, 0), simulation), yaw: -Math.PI / 2 };

    expect(simulation.applyKick(0, far)).toBeNull();
    expect(simulation.applyKick(0, turnedAway)).toBeNull();
    expect(simulation.getHealth()).toBe(simulation.maximumHealth);
  });

  it("체력이 0 이 되면 막타와 피해 순위를 남기고 쓰러졌다가 사라진다", () => {
    const simulation = createSpawnedSimulation(50);
    const first = facingBoss(createPlayer(4, 2, 0, 0), simulation);
    const second = facingBoss(createPlayer(9, 0, 2, 0), simulation);

    expect(simulation.applyKick(0, first)?.death).toBeNull();
    expect(simulation.applyKick(0, first)?.death).toBeNull();
    expect(simulation.applyKick(0, second)?.death).toBeNull();
    expect(simulation.applyKick(0, first)?.death).toBeNull();

    const death = simulation.applyKick(500, second)?.death;

    expect(death).toEqual({
      killedAt: 500,
      lastHitSeat: 9,
      ranking: [
        { actorKey: "actor-4", seat: 4, damage: 30 },
        { actorKey: "actor-9", seat: 9, damage: 20 },
      ],
    });
    expect(simulation.state.phase).toBe("dead");
    expect(simulation.applyKick(600, first)).toBeNull();

    run({
      simulation,
      fromMs: 500,
      seconds: SPACE_BOSS_DEATH.totalSeconds + 0.2,
      players: (now) => [createPlayer(4, 2, 0, now)],
    });

    expect(simulation.state.phase).toBe("hidden");
    expect(simulation.isResting()).toBe(true);
  });

  it("나갔다 다른 좌석으로 들어온 사람의 피해는 이어지고, 그 좌석을 물려받은 사람은 0 에서 시작한다", () => {
    const simulation = createSpawnedSimulation(50);
    const before = facingBoss(createPlayer(4, 2, 0, 0, { actorKey: "returning" }), simulation);
    // 같은 사람이 좌석 7 로 다시 들어오고, 비어 있던 좌석 4 에는 새 사람이 앉음.
    const after = { ...before, seat: 7 };
    const newcomer = facingBoss(createPlayer(4, 0, 2, 0, { actorKey: "newcomer" }), simulation);

    simulation.applyKick(0, before);
    simulation.applyKick(0, before);
    simulation.applyKick(0, newcomer);
    simulation.applyKick(0, after);

    const death = simulation.applyKick(500, after)?.death;

    expect(death?.ranking).toEqual([
      { actorKey: "returning", seat: 7, damage: 40 },
      { actorKey: "newcomer", seat: 4, damage: 10 },
    ]);
  });

  it("어그로도 사람 기준이라 좌석을 바꿔 들어와도 가장 많이 때린 사람을 쫓는다", () => {
    const simulation = createSpawnedSimulation();
    const heavy = facingBoss(createPlayer(4, 2, 0, 0, { actorKey: "heavy" }), simulation);

    simulation.applyKick(0, heavy);
    simulation.applyKick(0, heavy);

    run({
      simulation,
      fromMs: 0,
      seconds: 2,
      // 좌석 4 는 새 사람이 물려받았고, 많이 때린 사람은 좌석 7 로 들어와 있음.
      players: (now) => [
        createPlayer(4, -3, 0, now, { actorKey: "newcomer" }),
        createPlayer(7, 3, 0, now, { actorKey: "heavy" }),
      ],
    });

    expect(simulation.getTargetSeat()).toBe(7);
  });

  it("쓰러지면 그 사람의 누적 피해만 20% 깎이고 보스 체력은 그대로다", () => {
    const simulation = createSpawnedSimulation(100);
    const fallen = facingBoss(createPlayer(4, 2, 0, 0), simulation);
    const steady = facingBoss(createPlayer(9, 0, 2, 0), simulation);

    // 30 과 20 을 넣어 둠.
    for (const player of [fallen, fallen, fallen, steady, steady]) {
      simulation.applyKick(0, player);
    }

    simulation.applyPlayerDeath(fallen.actorKey);
    // 때린 적 없는 사람이 쓰러져도 아무 일 없음.
    simulation.applyPlayerDeath("stranger");

    expect(SPACE_BOSS_COMBAT.deathDamagePenaltyRatio).toBe(0.2);
    expect(simulation.getHealth()).toBe(50);

    // 남은 50 을 다른 사람이 마저 깎아 순위를 봄.
    let death = null;

    for (let swing = 0; swing < 5; swing += 1) {
      death = simulation.applyKick(100, steady)?.death ?? death;
    }

    expect(death?.ranking).toEqual([
      { actorKey: "actor-9", seat: 9, damage: 70 },
      { actorKey: "actor-4", seat: 4, damage: 24 },
    ]);
  });

  it("다 회복하고 나면 지난 싸움의 피해 기록을 지운다", () => {
    const simulation = createSpawnedSimulation();
    const players = (now: number) => [createPlayer(1, 2, 0, now)];
    const nowMs = run({ simulation, fromMs: 0, seconds: 0.5, players });

    simulation.applyKick(nowMs, facingBoss(players(nowMs)[0], simulation));
    expect(simulation.getHealth()).toBeLessThan(simulation.maximumHealth);

    run({ simulation, fromMs: nowMs, seconds: 30, players: () => [] });

    expect(simulation.getHealth()).toBe(simulation.maximumHealth);
    expect(simulation.isResting()).toBe(true);
  });
});
