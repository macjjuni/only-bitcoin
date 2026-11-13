import {
  createHiddenBossState,
  resolveBossAttackSeconds,
  resolveBossChargeTravel,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_TURN,
  type SpaceBossAttack,
  type SpaceBossPhase,
  type SpaceBossState,
} from "@/entities/space/model/boss";
import {
  canKickReachBoss,
  isAtBossArenaHeight,
  isInsideBossArena,
  isInsideBossAttack,
  isInsideBossChargeSweep,
} from "./bossHitTest";

/**
 * 보스 상태머신. 시계와 유저 목록을 밖에서 받는 순수 로직임.
 *
 * 서버(`SpaceRoom`)가 100 ms 틱으로 돌림.
 * 여기서는 보스만 다룸. 유저 체력·리스폰·프레임 송신은 부르는 쪽 일임.
 *
 * 흐름: 없음 → 등장 → 대기 ⇄ 추적 → 공격 → (대상 없음) 복귀·회복 → 대기, 체력 0 이면 처치 → 없음.
 */

export interface BossSimulationPlayer {
  seat: number;
  /**
   * 사람을 가리는 키. 피해를 이 키로 쌓음.
   *
   * 좌석은 나갔다 들어오면 바뀌고 빈 좌석은 다른 사람이 물려받음. 좌석으로 쌓으면
   * 재접속한 사람의 피해가 끊기고, 새로 온 사람이 앞사람 피해를 물려받음.
   */
  actorKey: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 마지막으로 이동·공격한 시각. 오래 가만히 있으면 타깃에서 뺌. */
  lastInputAt: number;
  /** 쓰러져 리스폰을 기다리는 중이면 `false`. 타깃도 안 되고 맞지도 않음. */
  isAlive: boolean;
}

export interface BossPlayerHit {
  seat: number;
  attack: SpaceBossAttack;
}

export interface BossDeath {
  killedAt: number;
  /** 막타를 친 좌석. */
  lastHitSeat: number;
  /** 피해 순위. 많이 준 순서. `seat` 는 그 사람이 마지막으로 때릴 때 앉아 있던 좌석임. */
  ranking: { actorKey: string; seat: number; damage: number }[];
}

export interface BossStepResult {
  /** 이번 걸음에 보스 공격에 맞은 유저. */
  hits: BossPlayerHit[];
}

export interface BossKickResult {
  damage: number;
  /** 이 공격으로 쓰러졌으면 값이 있음. */
  death: BossDeath | null;
}

export interface BossSimulation {
  /** 매 걸음 제자리에서 고침. 시각은 `step` 에 넘긴 시계 축임. */
  readonly state: SpaceBossState;
  readonly maximumHealth: number;
  getHealth: () => number;
  getTargetSeat: () => number | null;
  /**
   * 틱이 필요 없는지.
   *
   * 없거나, 가운데에 체력 가득으로 서 있고 아레나에 아무도 없으면 쉼. 서버는 이때 틱을 끔.
   */
  isResting: () => boolean;
  /** `spawnedAt` 에 나타난 것으로 시작함. 이미 한참 지났으면 다음 걸음에 바로 대기로 넘어감. */
  spawn: (spawnedAt: number) => void;
  /** 없는 상태로 되돌림. */
  hide: () => void;
  step: (
    nowMs: number,
    deltaSeconds: number,
    players: readonly BossSimulationPlayer[],
  ) => BossStepResult;
  /**
   * 유저가 공격을 휘두름. 안 닿았으면 `null`.
   *
   * @param damage 이 공격의 피해. 캐릭터마다 다름. 안 넘기면 표준 피해를 씀.
   */
  applyKick: (
    nowMs: number,
    player: BossSimulationPlayer,
    damage?: number,
  ) => BossKickResult | null;
  /**
   * 유저가 쓰러짐. 그 사람의 누적 피해를 `deathDamagePenaltyRatio` 만큼 깎음.
   *
   * 보스 체력은 그대로임. 그래서 순위의 피해 합은 보스 체력보다 작을 수 있음.
   */
  applyPlayerDeath: (actorKey: string) => void;
}

/** 거리별 공격 선택 기준(m). */
const ATTACK_RANGE = {
  /** 이 안이면 가까이 붙은 것으로 봄. 휘두르기와 내려찍기를 번갈아 씀. */
  close: 3.3,
  /** 내려찍기 원이 닿는 거리. */
  slam: 5.8,
  chargeMinimum: 6,
  chargeMaximum: 11,
} as const;
/** 이 각도 안으로 마주 봐야 공격을 시작함(rad). */
const ATTACK_FACING_ANGLE = 0.3;
/** 제자리로 돌아왔다고 보는 거리(m). */
const HOME_ARRIVAL_DISTANCE = 0.3;
/** 처치 결과에 싣는 순위 수. */
const RANKING_COUNT = 5;
/** 내려찍기 원 안에 이만큼 모여 있으면 거리와 상관없이 내려찍음. */
const SLAM_CROWD_COUNT = 2;

// region [Privates]
/** 전방이 −Z 인 규약에서 `(deltaX, deltaZ)` 쪽을 보는 yaw. */
const resolveYawToward = (deltaX: number, deltaZ: number): number => Math.atan2(-deltaX, -deltaZ);

/** −π…π 로 접은 각도 차. */
const resolveYawGap = (targetYaw: number, yaw: number): number => {
  const gap = (targetYaw - yaw) % (Math.PI * 2);

  if (gap > Math.PI) {
    return gap - Math.PI * 2;
  }

  return gap < -Math.PI ? gap + Math.PI * 2 : gap;
};

const smoothStep = (ratio: number): number => {
  const clamped = Math.min(1, Math.max(0, ratio));

  return clamped * clamped * (3 - 2 * clamped);
};

const isInsideArenaCircle = (x: number, z: number, margin: number): boolean => {
  const { centerX, centerZ, radius } = SPACE_BOSS.arena;

  return Math.hypot(x - centerX, z - centerZ) <= radius - margin;
};
// endregion

export const createBossSimulation = (
  maximumHealth: number = SPACE_BOSS_COMBAT.maximumHealth,
): BossSimulation => {
  const state = createHiddenBossState();
  let health = maximumHealth;
  let restUntil = 0;
  let chargeReadyAt = 0;
  let hasEnraged = false;
  let hasStaggered = false;
  let lastCloseAttack: SpaceBossAttack = "slam";
  /** 지금 하던 동작이 끝나면 틀 반응. 공격 도중에 끊지 않음. */
  let pendingReaction: "enrage" | "stagger" | null = null;
  let turnFromYaw = 0;
  let turnToYaw = 0;
  let targetSeat: number | null = null;
  let targetPickedAt = Number.NEGATIVE_INFINITY;
  let lastHitSeat = -1;
  /** 직전 걸음에 아레나에 타깃 후보가 있었는지. 쉬어도 되는지 판단에 씀. */
  let hadCandidates = false;
  /** 직전 걸음까지 진행한 공격 시간(초). 판정 시각을 넘는 순간을 잡음. */
  let attackElapsedSeconds = 0;
  /** 이번 돌진에 이미 맞은 좌석. 같은 사람은 한 번만 맞음. */
  const chargeHitSeats = new Set<number>();
  /** 사람별 누적 피해. 어그로와 처치 순위에 씀. 좌석은 마지막으로 때릴 때의 것임. */
  const damageByActor = new Map<string, { seat: number; damage: number }>();
  /** 아레나에 들어온 시각. 아무도 안 때렸을 때 먼저 온 사람을 쫓음. */
  const enteredAtBySeat = new Map<number, number>();

  const enterPhase = (
    phase: SpaceBossPhase,
    nowMs: number,
    attack: SpaceBossAttack | null = null,
  ): void => {
    state.phase = phase;
    state.attack = attack;
    state.phaseStartedAt = nowMs;
    state.speed = 0;
  };

  const resetFight = (): void => {
    health = maximumHealth;
    restUntil = 0;
    chargeReadyAt = 0;
    hasEnraged = false;
    hasStaggered = false;
    pendingReaction = null;
    targetSeat = null;
    targetPickedAt = Number.NEGATIVE_INFINITY;
    lastHitSeat = -1;
    damageByActor.clear();
  };

  const placeAtHome = (): void => {
    const home = createHiddenBossState();

    state.x = home.x;
    state.z = home.z;
    state.yaw = home.yaw;
    state.attackOriginX = home.x;
    state.attackOriginZ = home.z;
    state.lastHitAt = undefined;
  };

  const startAttack = (attack: SpaceBossAttack, nowMs: number): void => {
    enterPhase("attack", nowMs, attack);
    state.attackOriginX = state.x;
    state.attackOriginZ = state.z;
    attackElapsedSeconds = 0;
    chargeHitSeats.clear();

    if (attack === "charge") {
      chargeReadyAt = nowMs + SPACE_BOSS_COMBAT.chargeIntervalMs;
    } else {
      lastCloseAttack = attack;
    }
  };

  const startTurn = (targetYaw: number, nowMs: number): void => {
    turnFromYaw = state.yaw;
    turnToYaw = state.yaw + resolveYawGap(targetYaw, state.yaw);
    enterPhase("turn", nowMs);
  };

  const rotateToward = (targetYaw: number, deltaSeconds: number): number => {
    const gap = resolveYawGap(targetYaw, state.yaw);
    const maximumStep = SPACE_BOSS.turnRate * deltaSeconds;

    state.yaw += Math.min(maximumStep, Math.max(-maximumStep, gap));

    return gap;
  };

  /**
   * 목표로 한 걸음 감.
   *
   * 목표를 등지고 있을수록 느려짐. 등진 채 제 속도로 가면 뒷걸음질로 보임.
   */
  const moveToward = (
    phase: "walk" | "run",
    targetX: number,
    targetZ: number,
    speed: number,
    nowMs: number,
    deltaSeconds: number,
  ): void => {
    const deltaX = targetX - state.x;
    const deltaZ = targetZ - state.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const gap = rotateToward(resolveYawToward(deltaX, deltaZ), deltaSeconds);
    const facingSpeed = speed * Math.max(0, Math.cos(gap));
    const stride = Math.min(distance, facingSpeed * deltaSeconds);

    if (state.phase !== phase) {
      enterPhase(phase, nowMs);
    }

    state.speed = facingSpeed;

    if (distance <= 1e-4) {
      return;
    }

    const nextX = state.x + (deltaX / distance) * stride;
    const nextZ = state.z + (deltaZ / distance) * stride;

    // 서버가 지형을 몰라서 아레나 밖(계단·담)으로는 안 나감.
    if (isInsideArenaCircle(nextX, nextZ, 0)) {
      state.x = nextX;
      state.z = nextZ;
    }
  };

  const standStill = (nowMs: number): void => {
    if (state.phase !== "idle") {
      enterPhase("idle", nowMs);
    }
  };

  const toAttackOrigin = () => ({
    x: state.attackOriginX,
    z: state.attackOriginZ,
    yaw: state.yaw,
  });

  /** 거리로 공격을 고름. 쓸 게 없으면 `null`(더 다가가야 함). */
  const chooseAttack = (
    distance: number,
    nowMs: number,
    candidates: readonly BossSimulationPlayer[],
  ): SpaceBossAttack | null => {
    const here = { x: state.x, z: state.z, yaw: state.yaw };
    const slamCrowd = candidates.filter((player) =>
      isInsideBossAttack("slam", here, player),
    ).length;

    if (slamCrowd >= SLAM_CROWD_COUNT) {
      return "slam";
    }

    if (distance <= ATTACK_RANGE.close) {
      return lastCloseAttack === "swipe" ? "slam" : "swipe";
    }

    if (distance <= ATTACK_RANGE.slam) {
      return "slam";
    }

    const isChargeDistance =
      distance >= ATTACK_RANGE.chargeMinimum && distance <= ATTACK_RANGE.chargeMaximum;
    const { travel } = SPACE_BOSS_ATTACKS.charge;
    const endX = state.x - Math.sin(state.yaw) * travel;
    const endZ = state.z - Math.cos(state.yaw) * travel;

    // 끝점이 아레나 밖이면 담을 뚫고 나감.
    if (isChargeDistance && nowMs >= chargeReadyAt && isInsideArenaCircle(endX, endZ, 1)) {
      return "charge";
    }

    return null;
  };

  /** 타깃 후보. 아레나 안에 살아 있고 최근에 움직인 사람만. */
  const collectCandidates = (
    nowMs: number,
    players: readonly BossSimulationPlayer[],
  ): BossSimulationPlayer[] => {
    const candidates = players.filter(
      (player) =>
        player.isAlive &&
        isInsideBossArena(player) &&
        nowMs - player.lastInputAt <= SPACE_BOSS_COMBAT.awayTimeoutMs,
    );
    const candidateSeats = new Set(candidates.map((player) => player.seat));

    for (const seat of enteredAtBySeat.keys()) {
      if (!candidateSeats.has(seat)) {
        enteredAtBySeat.delete(seat);
      }
    }
    for (const seat of candidateSeats) {
      if (!enteredAtBySeat.has(seat)) {
        enteredAtBySeat.set(seat, nowMs);
      }
    }

    return candidates;
  };

  /**
   * 쫓을 사람을 고름. 누적 피해 1위, 아직 아무도 안 때렸으면 먼저 들어온 사람.
   *
   * 1초에 한 번만 다시 고름. 매 틱 고르면 피해가 엎치락뒤치락할 때 보스가 제자리에서 떪.
   */
  const pickTarget = (
    nowMs: number,
    candidates: readonly BossSimulationPlayer[],
  ): BossSimulationPlayer | null => {
    const current = candidates.find((player) => player.seat === targetSeat);

    if (current && nowMs - targetPickedAt < SPACE_BOSS_COMBAT.targetRepickMs) {
      return current;
    }

    let best: BossSimulationPlayer | null = null;

    for (const player of candidates) {
      if (!best) {
        best = player;
        continue;
      }

      const damage = damageByActor.get(player.actorKey)?.damage ?? 0;
      const bestDamage = damageByActor.get(best.actorKey)?.damage ?? 0;
      const enteredAt = enteredAtBySeat.get(player.seat) ?? nowMs;
      const bestEnteredAt = enteredAtBySeat.get(best.seat) ?? nowMs;

      if (damage > bestDamage || (damage === bestDamage && enteredAt < bestEnteredAt)) {
        best = player;
      }
    }

    targetSeat = best?.seat ?? null;
    targetPickedAt = nowMs;

    return best;
  };

  /** 대상이 없으면 가운데로 걸어 돌아가며 체력을 채움. */
  const returnHome = (nowMs: number, deltaSeconds: number): void => {
    const { centerX, centerZ } = SPACE_BOSS.arena;
    const deltaX = centerX - state.x;
    const deltaZ = centerZ - state.z;

    health = Math.min(
      maximumHealth,
      health + maximumHealth * SPACE_BOSS_COMBAT.returnHealRatio * deltaSeconds,
    );

    if (Math.hypot(deltaX, deltaZ) <= HOME_ARRIVAL_DISTANCE) {
      standStill(nowMs);

      if (health >= maximumHealth) {
        // 다 회복했으면 싸움이 끝난 것임. 다음 싸움은 처음부터.
        resetFight();
      }
      return;
    }

    const targetYaw = resolveYawToward(deltaX, deltaZ);

    if (
      state.phase === "idle" &&
      Math.abs(resolveYawGap(targetYaw, state.yaw)) > SPACE_BOSS.turnInPlaceAngle
    ) {
      startTurn(targetYaw, nowMs);
      return;
    }

    moveToward("walk", centerX, centerZ, SPACE_BOSS.returnSpeed, nowMs, deltaSeconds);
  };

  const engage = (
    nowMs: number,
    deltaSeconds: number,
    target: BossSimulationPlayer,
    candidates: readonly BossSimulationPlayer[],
  ): void => {
    const deltaX = target.x - state.x;
    const deltaZ = target.z - state.z;
    const distance = Math.hypot(deltaX, deltaZ);
    const targetYaw = resolveYawToward(deltaX, deltaZ);
    const gap = resolveYawGap(targetYaw, state.yaw);

    // 서 있다가 크게 돌아야 하면 발을 떼며 돎. 달리는 중에는 곡선으로 돌아감.
    if (state.phase === "idle" && Math.abs(gap) > SPACE_BOSS.turnInPlaceAngle) {
      startTurn(targetYaw, nowMs);
      return;
    }

    if (nowMs < restUntil) {
      // 숨 고르는 중. 제자리에서 시선만 따라감.
      rotateToward(targetYaw, deltaSeconds);
      standStill(nowMs);
      return;
    }

    const attack =
      Math.abs(gap) <= ATTACK_FACING_ANGLE ? chooseAttack(distance, nowMs, candidates) : null;

    if (attack) {
      startAttack(attack, nowMs);
      return;
    }

    if (distance > ATTACK_RANGE.close) {
      moveToward("run", target.x, target.z, SPACE_BOSS.chaseSpeed, nowMs, deltaSeconds);
      return;
    }

    rotateToward(targetYaw, deltaSeconds);
    standStill(nowMs);
  };

  const decide = (
    nowMs: number,
    deltaSeconds: number,
    candidates: readonly BossSimulationPlayer[],
  ): void => {
    if (pendingReaction) {
      enterPhase(pendingReaction, nowMs);
      pendingReaction = null;
      return;
    }

    const target = pickTarget(nowMs, candidates);

    if (target) {
      engage(nowMs, deltaSeconds, target, candidates);
    } else {
      returnHome(nowMs, deltaSeconds);
    }
  };

  /** 공격을 진행하고 이번 걸음에 맞은 사람을 `hits` 에 담음. */
  const stepAttack = (
    nowMs: number,
    elapsedSeconds: number,
    players: readonly BossSimulationPlayer[],
    hits: BossPlayerHit[],
  ): void => {
    const attack = state.attack;

    if (!attack) {
      enterPhase("idle", nowMs);
      return;
    }

    const origin = toAttackOrigin();
    // 아레나 밖 가장자리에 선 사람은 맞지만, 위층(발코니)에 선 사람은 안 맞음.
    const alivePlayers = players.filter((player) => player.isAlive && isAtBossArenaHeight(player));

    if (attack === "charge") {
      const travelFrom = resolveBossChargeTravel(attackElapsedSeconds);
      const travelTo = resolveBossChargeTravel(elapsedSeconds);

      state.x = state.attackOriginX - Math.sin(state.yaw) * travelTo;
      state.z = state.attackOriginZ - Math.cos(state.yaw) * travelTo;

      // 서 있는 동안(출발 전·도착 뒤)에는 안 맞음. 나아간 구간만 봄.
      if (travelTo > travelFrom) {
        for (const player of alivePlayers) {
          if (
            !chargeHitSeats.has(player.seat) &&
            isInsideBossChargeSweep(
              origin,
              player,
              travelFrom,
              travelTo,
              SPACE_BOSS_COMBAT.hitMargin,
            )
          ) {
            chargeHitSeats.add(player.seat);
            hits.push({ seat: player.seat, attack });
          }
        }
      }
    } else {
      const { hitSeconds } = SPACE_BOSS_ATTACKS[attack];

      // 판정 시각을 넘는 걸음에 한 번만 봄.
      if (attackElapsedSeconds < hitSeconds && elapsedSeconds >= hitSeconds) {
        for (const player of alivePlayers) {
          if (isInsideBossAttack(attack, origin, player)) {
            hits.push({ seat: player.seat, attack });
          }
        }
      }
    }

    attackElapsedSeconds = elapsedSeconds;

    if (elapsedSeconds >= resolveBossAttackSeconds(attack)) {
      restUntil = nowMs + SPACE_BOSS.attackRestSeconds * 1000;
      enterPhase("idle", nowMs);
    }
  };

  const stepTurn = (nowMs: number, elapsedSeconds: number): void => {
    const { pivotFromSeconds, pivotUntilSeconds } = SPACE_BOSS_TURN;
    const pivotRatio = (elapsedSeconds - pivotFromSeconds) / (pivotUntilSeconds - pivotFromSeconds);

    state.yaw = turnFromYaw + (turnToYaw - turnFromYaw) * smoothStep(pivotRatio);

    if (elapsedSeconds >= SPACE_BOSS_CLIP_SECONDS.turn) {
      enterPhase("idle", nowMs);
    }
  };

  const step = (
    nowMs: number,
    deltaSeconds: number,
    players: readonly BossSimulationPlayer[],
  ): BossStepResult => {
    const hits: BossPlayerHit[] = [];
    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;
    const candidates = state.phase === "hidden" ? [] : collectCandidates(nowMs, players);

    hadCandidates = candidates.length > 0;

    switch (state.phase) {
      case "hidden":
        break;
      case "spawn":
        if (elapsedSeconds >= SPACE_BOSS_SPAWN.totalSeconds) {
          enterPhase("idle", nowMs);
        }
        break;
      case "dead":
        if (elapsedSeconds >= SPACE_BOSS_DEATH.totalSeconds) {
          enterPhase("hidden", nowMs);
        }
        break;
      case "stagger":
      case "enrage":
        if (elapsedSeconds >= SPACE_BOSS_CLIP_SECONDS[state.phase]) {
          enterPhase("idle", nowMs);
        }
        break;
      case "turn":
        stepTurn(nowMs, elapsedSeconds);
        break;
      case "attack":
        stepAttack(nowMs, elapsedSeconds, players, hits);
        break;
      case "idle":
      case "walk":
      case "run":
        decide(nowMs, deltaSeconds, candidates);
        break;
      default:
        throw new Error(`알 수 없는 보스 상태입니다: ${state.phase satisfies never}`);
    }

    return { hits };
  };

  const createDeath = (nowMs: number): BossDeath => ({
    killedAt: nowMs,
    lastHitSeat,
    ranking: Array.from(damageByActor, ([actorKey, { seat, damage }]) => ({
      actorKey,
      seat,
      damage,
    }))
      .sort((first, second) => second.damage - first.damage)
      .slice(0, RANKING_COUNT),
  });

  const applyKick = (
    nowMs: number,
    player: BossSimulationPlayer,
    kickDamage: number = SPACE_BOSS_COMBAT.kickDamage,
  ): BossKickResult | null => {
    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;
    const isInvulnerable =
      state.phase === "hidden" ||
      state.phase === "dead" ||
      (state.phase === "spawn" && elapsedSeconds < SPACE_BOSS_SPAWN.invulnerableSeconds);

    if (
      isInvulnerable ||
      !player.isAlive ||
      !isAtBossArenaHeight(player) ||
      !canKickReachBoss(state, player)
    ) {
      return null;
    }

    const damage = Math.min(health, kickDamage);

    health -= damage;
    lastHitSeat = player.seat;
    state.lastHitAt = nowMs;
    damageByActor.set(player.actorKey, {
      seat: player.seat,
      damage: (damageByActor.get(player.actorKey)?.damage ?? 0) + damage,
    });

    if (health <= 0) {
      const death = createDeath(nowMs);

      enterPhase("dead", nowMs);

      return { damage, death };
    }

    if (!hasEnraged && health <= maximumHealth * SPACE_BOSS_COMBAT.enrageHealthRatio) {
      hasEnraged = true;
      pendingReaction = "enrage";
    } else if (!hasStaggered && health <= maximumHealth * SPACE_BOSS_COMBAT.staggerHealthRatio) {
      hasStaggered = true;
      pendingReaction = "stagger";
    }

    return { damage, death: null };
  };

  const isAtHome = (): boolean => {
    const { centerX, centerZ } = SPACE_BOSS.arena;

    return Math.hypot(state.x - centerX, state.z - centerZ) <= HOME_ARRIVAL_DISTANCE;
  };

  return {
    state,
    maximumHealth,
    getHealth: () => health,
    getTargetSeat: () => targetSeat,
    isResting: () => {
      if (state.phase === "hidden") {
        return true;
      }

      if (hadCandidates) {
        return false;
      }

      return (
        state.phase === "spawn" || (state.phase === "idle" && isAtHome() && health >= maximumHealth)
      );
    },
    spawn: (spawnedAt) => {
      resetFight();
      placeAtHome();
      enteredAtBySeat.clear();
      hadCandidates = false;
      enterPhase("spawn", spawnedAt);
    },
    hide: () => {
      enterPhase("hidden", 0);
      hadCandidates = false;
    },
    step,
    applyKick,
    applyPlayerDeath: (actorKey) => {
      const tally = damageByActor.get(actorKey);

      if (tally) {
        // 정수로 내림. 순위 프레임과 화면이 정수 피해를 씀.
        tally.damage = Math.floor(tally.damage * (1 - SPACE_BOSS_COMBAT.deathDamagePenaltyRatio));
      }
    },
  };
};
