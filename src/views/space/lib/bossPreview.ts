import {
  createHiddenBossState,
  resolveBossAttackSeconds,
  resolveBossChargeTravel,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_TURN,
  type SpaceBossAttack,
  type SpaceBossPhase,
  type SpaceBossState,
} from "@/entities/space";

/**
 * 개발 전용 보스 미리보기.
 *
 * 서버 보스가 아직 없어서, 내 화면에서만 도는 흉내 보스로 모션 연결을 확인함.
 * 나 한 명을 상대로 쫓고 · 공격하고 · 맞고 · 죽고 · 다시 나옴. 유저는 맞지 않음.
 *
 * **판정 규칙의 기준이 아님.** 서버 상태머신(`docs/btc-space-boss-raid.md` §3.3)이 붙으면
 * 이 파일은 지움. 같이 쓸 값은 전부 `entities/space/model/boss.ts` 에 있음.
 */

export interface BossPreviewPlayer {
  x: number;
  y: number;
  z: number;
}

export interface BossPreview {
  /** 매 프레임 제자리에서 고침. 렌더 쪽은 이 객체를 그대로 읽음. */
  state: SpaceBossState;
  step: (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer) => void;
  /** 내가 공격을 휘둘렀을 때. 닿는 거리면 보스가 맞음. */
  registerKick: (nowMs: number, player: BossPreviewPlayer) => void;
}

/** 미리보기 전용 수치. 혼자 금방 한 바퀴를 볼 수 있게 체력을 작게 잡았음. */
const PREVIEW = {
  maximumHealth: 200,
  kickDamage: 10,
  /** 몸통에서 이 거리 안이면 맞음(m). */
  kickReach: 2,
  /** 처치 뒤 다시 나올 때까지(ms). */
  respawnDelayMs: 4_000,
  /** 돌진을 연달아 쓰지 않게 두는 간격(ms). */
  chargeIntervalMs: 6_000,
  /** 이 높이 차 안이어야 아레나에 있는 것으로 봄(m). 발코니는 위라서 빠짐. */
  arenaHeightTolerance: 2.5,
  /** 이 각도 안으로 마주 봐야 공격을 시작함(rad). */
  attackFacingAngle: 0.3,
  /** 가까울 때 쓰는 공격의 최대 거리(m). 넘으면 내려찍기 범위임. */
  swipeDistance: 3.3,
  slamDistance: 5.8,
  chargeMinimumDistance: 6,
  chargeMaximumDistance: 11,
  /** 제자리로 돌아왔다고 보는 거리(m). */
  homeArrivalDistance: 0.3,
  /** 복귀 중 초당 회복 비율. */
  returnHealRatio: 0.05,
} as const;

// region [Privates]
/** 전방이 −Z 인 규약에서 `(dx, dz)` 쪽을 보는 yaw. */
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

const isInsideArena = (x: number, z: number, margin: number): boolean => {
  const { centerX, centerZ, radius } = SPACE_BOSS.arena;

  return Math.hypot(x - centerX, z - centerZ) <= radius - margin;
};
// endregion

export const createBossPreview = (): BossPreview => {
  const state = createHiddenBossState();
  let health: number = PREVIEW.maximumHealth;
  let respawnAt = 0;
  let restUntil = 0;
  let chargeReadyAt = 0;
  let hasEnraged = false;
  let hasStaggered = false;
  let lastCloseAttack: SpaceBossAttack = "slam";
  /** 지금 하던 동작이 끝나면 틀 반응. 공격 도중에 끊지 않음. */
  let pendingReaction: "enrage" | "stagger" | null = null;
  let turnFromYaw = 0;
  let turnToYaw = 0;

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

  const startAttack = (attack: SpaceBossAttack, nowMs: number): void => {
    enterPhase("attack", nowMs, attack);
    state.attackOriginX = state.x;
    state.attackOriginZ = state.z;

    if (attack === "charge") {
      chargeReadyAt = nowMs + PREVIEW.chargeIntervalMs;
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
    const step = Math.min(distance, facingSpeed * deltaSeconds);

    if (state.phase !== phase) {
      enterPhase(phase, nowMs);
    }

    state.speed = facingSpeed;

    if (distance > 1e-4) {
      state.x += (deltaX / distance) * step;
      state.z += (deltaZ / distance) * step;
    }
  };

  const standStill = (nowMs: number): void => {
    if (state.phase !== "idle") {
      enterPhase("idle", nowMs);
    }
  };

  /** 거리로 공격을 고름. 쓸 게 없으면 `null`(더 다가가야 함). */
  const chooseAttack = (distance: number, nowMs: number): SpaceBossAttack | null => {
    if (distance <= PREVIEW.swipeDistance) {
      return lastCloseAttack === "swipe" ? "slam" : "swipe";
    }

    if (distance <= PREVIEW.slamDistance) {
      return "slam";
    }

    const isChargeDistance =
      distance >= PREVIEW.chargeMinimumDistance && distance <= PREVIEW.chargeMaximumDistance;
    const { travel } = SPACE_BOSS_ATTACKS.charge;
    const endX = state.x - Math.sin(state.yaw) * travel;
    const endZ = state.z - Math.cos(state.yaw) * travel;

    // 끝점이 아레나 밖이면 담을 뚫고 나감.
    if (isChargeDistance && nowMs >= chargeReadyAt && isInsideArena(endX, endZ, 1)) {
      return "charge";
    }

    return null;
  };

  /** 대상이 없으면 가운데로 걸어 돌아가며 체력을 채움. */
  const returnHome = (nowMs: number, deltaSeconds: number): void => {
    const { centerX, centerZ } = SPACE_BOSS.arena;
    const deltaX = centerX - state.x;
    const deltaZ = centerZ - state.z;

    health = Math.min(
      PREVIEW.maximumHealth,
      health + PREVIEW.maximumHealth * PREVIEW.returnHealRatio * deltaSeconds,
    );

    if (Math.hypot(deltaX, deltaZ) <= PREVIEW.homeArrivalDistance) {
      standStill(nowMs);
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

  const engage = (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer): void => {
    const deltaX = player.x - state.x;
    const deltaZ = player.z - state.z;
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
      Math.abs(gap) <= PREVIEW.attackFacingAngle ? chooseAttack(distance, nowMs) : null;

    if (attack) {
      startAttack(attack, nowMs);
      return;
    }

    if (distance > PREVIEW.swipeDistance) {
      moveToward("run", player.x, player.z, SPACE_BOSS.chaseSpeed, nowMs, deltaSeconds);
      return;
    }

    rotateToward(targetYaw, deltaSeconds);
    standStill(nowMs);
  };

  const decide = (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer): void => {
    if (pendingReaction) {
      enterPhase(pendingReaction, nowMs);
      pendingReaction = null;
      return;
    }

    const isPlayerEngaged =
      isInsideArena(player.x, player.z, 0) &&
      Math.abs(player.y - SPACE_BOSS.arena.floorY) <= PREVIEW.arenaHeightTolerance;

    if (isPlayerEngaged) {
      engage(nowMs, deltaSeconds, player);
    } else {
      returnHome(nowMs, deltaSeconds);
    }
  };

  const respawn = (nowMs: number): void => {
    const hidden = createHiddenBossState();

    state.x = hidden.x;
    state.z = hidden.z;
    state.yaw = hidden.yaw;
    state.lastHitAt = undefined;
    health = PREVIEW.maximumHealth;
    hasEnraged = false;
    hasStaggered = false;
    pendingReaction = null;
    restUntil = 0;
    chargeReadyAt = 0;
    enterPhase("spawn", nowMs);
  };

  const stepAttack = (nowMs: number, elapsedSeconds: number): void => {
    if (state.attack === "charge") {
      const travel = resolveBossChargeTravel(elapsedSeconds);

      state.x = state.attackOriginX - Math.sin(state.yaw) * travel;
      state.z = state.attackOriginZ - Math.cos(state.yaw) * travel;
    }

    if (state.attack && elapsedSeconds >= resolveBossAttackSeconds(state.attack)) {
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

  const step = (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer): void => {
    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;

    switch (state.phase) {
      case "hidden":
        if (nowMs >= respawnAt) {
          respawn(nowMs);
        }
        return;
      case "spawn":
        if (elapsedSeconds >= SPACE_BOSS_SPAWN.totalSeconds) {
          enterPhase("idle", nowMs);
        }
        return;
      case "dead":
        if (elapsedSeconds >= SPACE_BOSS_DEATH.totalSeconds) {
          respawnAt = nowMs + PREVIEW.respawnDelayMs;
          enterPhase("hidden", nowMs);
        }
        return;
      case "stagger":
      case "enrage":
        if (elapsedSeconds >= SPACE_BOSS_CLIP_SECONDS[state.phase]) {
          enterPhase("idle", nowMs);
        }
        return;
      case "turn":
        stepTurn(nowMs, elapsedSeconds);
        return;
      case "attack":
        stepAttack(nowMs, elapsedSeconds);
        return;
      case "idle":
      case "walk":
      case "run":
        decide(nowMs, deltaSeconds, player);
        return;
      default:
        throw new Error(`알 수 없는 보스 상태입니다: ${state.phase satisfies never}`);
    }
  };

  const registerKick = (nowMs: number, player: BossPreviewPlayer): void => {
    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;
    const isInvulnerable =
      state.phase === "hidden" ||
      state.phase === "dead" ||
      (state.phase === "spawn" && elapsedSeconds < SPACE_BOSS_SPAWN.invulnerableSeconds);
    const distance = Math.hypot(player.x - state.x, player.z - state.z);

    if (isInvulnerable || distance > SPACE_BOSS.bodyRadius + PREVIEW.kickReach) {
      return;
    }

    health -= PREVIEW.kickDamage;
    state.lastHitAt = nowMs;

    if (health <= 0) {
      enterPhase("dead", nowMs);
      return;
    }

    if (!hasEnraged && health <= PREVIEW.maximumHealth * 0.5) {
      hasEnraged = true;
      pendingReaction = "enrage";
      return;
    }

    if (!hasStaggered && health <= PREVIEW.maximumHealth * 0.25) {
      hasStaggered = true;
      pendingReaction = "stagger";
    }
  };

  return { state, step, registerKick };
};
