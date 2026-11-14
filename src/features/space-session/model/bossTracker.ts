import {
  createHiddenBossState,
  resolveBossChargeTravel,
  resolveBossSpawnedAt,
  resolveBossSpinPosition,
  SPACE_BOSS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_SPAWN,
  SPACE_NETWORK_INTERVAL_MS,
  type SpaceBossState,
  type SpaceBossWire,
} from "@/entities/space";

/**
 * 서버가 보낸 보스 정보를 화면에 그릴 상태로 바꿈.
 *
 * 두 가지 출처를 이어 붙임.
 * - **싸우는 중**: 서버가 100 ms 마다 보내는 `boss` 프레임. 10 Hz 를 그대로 그리면 끊겨
 *   보여서 위치·방향을 부드럽게 따라감. 걷거나 달리는 동안은 프레임 사이를 직전 속도로
 *   이어 그려서, 프레임이 늦거나 몰려 와도(모바일 망) 멈췄다 튀지 않음. 회전 공격은
 *   서버가 미리 알려 준 이동 구간을 서버와 같은 식으로 그려서 프레임을 안 기다림.
 * - **쉬는 중**: 서버가 아무것도 안 보냄. 마지막 처치 시각과 젠 계산식으로 스스로 그림.
 *   방이 비어 서버가 잠들어 있어도 젠 시각이 되면 보스가 솟아오름.
 *
 * 시각은 서버 축으로 오고, 여기서 `performance.now()` 축으로 옮겨 내보냄.
 */

export interface BossHealth {
  health: number;
  maximumHealth: number;
}

export interface BossTracker {
  /** 그릴 상태. `sample` 이 매 프레임 제자리에서 고침. */
  readonly state: SpaceBossState;
  /** 입장 응답을 받았을 때. 서버가 보스를 모르면 `null` 을 넘겨 끔. */
  reset: (
    welcome: { lastKilledAt: number | null; wire?: SpaceBossWire; nowMs: number } | null,
  ) => void;
  /**
   * @param serverAt 서버가 이 프레임을 만든 시각(서버 축). 있으면 프레임 사이를 이어 그림.
   */
  applyWire: (wire: SpaceBossWire, nowMs: number, serverAt?: number) => void;
  /** 누가 보스를 맞힘. 움찔 연출과 체력에 반영함. */
  applyHit: (health: number, nowMs: number) => void;
  /** 처치됨. 다음 젠 시각까지 없는 것으로 계산함. */
  applyDefeat: (killedAt: number) => void;
  /**
   * 젠 시각이 아닌데 다시 나옴(개발 서버). 처치 기록을 지우고 `spawnedAt`(서버 축)부터
   * 등장 연출을 틂.
   */
  applySpawn: (spawnedAt: number) => void;
  /**
   * 지금 그릴 상태를 구함.
   *
   * @param clockOffsetMs 서버 시각 − 로컬 시각. 아직 못 쟀으면 `null` 이고 그동안은 안 그림.
   */
  sample: (nowMs: number, clockOffsetMs: number | null) => SpaceBossState;
  /** 보스 체력. 없으면 `null`. */
  getHealth: () => BossHealth | null;
}

/** 이 시간 동안 프레임이 끊기면 싸움 상태를 버리고 젠 계산으로 돌아감(ms). */
const WIRE_STALE_MS = 2_000;
/** 서버 위치를 따라가는 빠르기(1/초). 클수록 바짝 붙고 작을수록 부드러움. */
const FOLLOW_RATE = 14;
/** 이보다 멀리 떨어지면 따라가지 않고 바로 옮김(m). 재접속 직후 같은 경우임. */
const SNAP_DISTANCE = 3;
/** 한 프레임으로 볼 최대 시간(초). 탭이 멈췄다 돌아오면 한 번에 끝까지 따라붙음. */
const MAXIMUM_FRAME_SECONDS = 0.1;
/**
 * 마지막 프레임에서 앞질러 그리는 시간 상한(ms). 프레임이 이보다 오래 안 오면 그 자리에 섬.
 *
 * 길게 잡으면 보스가 멈춰 공격을 시작했을 때 지나친 만큼 되돌아오는 게 눈에 띔.
 */
const MAXIMUM_PREDICTION_MS = 250;
/** 두 프레임의 서버 시각 차가 이 안이어야 속도를 구함(ms). 틱은 100 ms 임. */
const VELOCITY_MINIMUM_SPAN_MS = 50;
const VELOCITY_MAXIMUM_SPAN_MS = 350;
/**
 * 회전 공격의 구간 위 자리를 따라가는 빠르기(1/초).
 *
 * 구간 자리는 이미 매끄러워서 바짝 붙음. 다음 구간이 늦게 도착했을 때만 따라붙는 걸 누그러뜨림.
 */
const SPIN_FOLLOW_RATE = 30;

// region [Privates]
/** −π…π 로 접은 각도 차. */
const resolveYawGap = (targetYaw: number, yaw: number): number => {
  const gap = (targetYaw - yaw) % (Math.PI * 2);

  if (gap > Math.PI) {
    return gap - Math.PI * 2;
  }

  return gap < -Math.PI ? gap + Math.PI * 2 : gap;
};

/**
 * 직전 속도로 앞질러 그려도 되는 상태인지.
 *
 * 걷기·달리기는 도는 속도에 상한이 있어 속도가 천천히 바뀜. 회전 공격은 뺌 — 타깃에
 * 붙으면 서고 떨어지면 곧장 그쪽으로 가서 틱마다 속도가 뒤집히고, 앞질러 그리면 그때마다
 * 자리가 튀었음.
 */
const isPredictableWire = (wire: SpaceBossWire): boolean => {
  return wire.phase === "walk" || wire.phase === "run";
};

const isSpinWire = (wire: SpaceBossWire): boolean => {
  return wire.phase === "attack" && wire.attack === "spin";
};

/**
 * 서버가 "쉬러 들어감" 으로 보낸 마지막 프레임인지.
 *
 * 이 뒤로는 프레임이 안 오므로 젠 계산으로 넘어가야 함.
 */
const isRestingWire = (wire: SpaceBossWire): boolean => {
  if (wire.phase === "hidden") {
    return true;
  }

  const { centerX, centerZ } = SPACE_BOSS.arena;
  const isAtHome = Math.hypot(wire.x - centerX, wire.z - centerZ) <= 0.5;

  return (
    wire.targetSeat === null &&
    wire.health >= wire.maximumHealth &&
    (wire.phase === "spawn" || (wire.phase === "idle" && isAtHome))
  );
};
// endregion

export const createBossTracker = (): BossTracker => {
  const state = createHiddenBossState();
  let isEnabled = false;
  let lastKilledAt: number | null = null;
  let wire: SpaceBossWire | null = null;
  let wireReceivedAt = 0;
  /** 마지막 프레임을 서버가 만든 시각(서버 축). 모르면 `null`. */
  let wireServerAt: number | null = null;
  /** 직전 두 프레임으로 구한 속도(m/s). 프레임 사이를 이어 그리는 데 씀. */
  let wireVelocityX = 0;
  let wireVelocityZ = 0;
  /** 같은 회전 공격의 직전 프레임 자리. 여기서 새 프레임 자리까지 한 틱에 걸쳐 옮김. */
  let spinFromX = 0;
  let spinFromZ = 0;
  let health: number | null = null;
  let lastHitAt: number | undefined;
  let lastSampledAt = Number.NEGATIVE_INFINITY;
  /** 직전에 싸움 상태를 그렸는지. 처음 그릴 때는 따라가지 않고 바로 놓음. */
  let wasFollowingWire = false;
  /**
   * 젠 계산으로 구한 등장 시각(서버 축)과 그걸 로컬 축으로 옮긴 값.
   *
   * 한 번 옮긴 값을 계속 씀. 시계 보정이 조금씩 바뀔 때마다 다시 옮기면 시작 시각이
   * 흔들려 모션이 처음부터 다시 재생됨.
   */
  let scheduleSpawnedAt: number | null = null;
  let scheduleLocalStartedAt = 0;
  /** 서버가 따로 알려 준 등장 시각(서버 축). 있으면 젠 계산 대신 이걸 씀. */
  let announcedSpawnedAt: number | null = null;

  const hide = (): void => {
    state.phase = "hidden";
    state.attack = null;
    state.speed = 0;
    state.lastHitAt = undefined;
  };

  const placeAtHome = (): void => {
    const home = createHiddenBossState();

    state.x = home.x;
    state.z = home.z;
    state.yaw = home.yaw;
    state.attackOriginX = home.x;
    state.attackOriginZ = home.z;
  };

  /** 쉬는 보스. 젠 직후면 솟아오르는 중이고, 아니면 가운데 서 있음. */
  const sampleSchedule = (nowMs: number, clockOffsetMs: number): void => {
    const spawnedAt =
      announcedSpawnedAt ?? resolveBossSpawnedAt(nowMs + clockOffsetMs, lastKilledAt);

    wasFollowingWire = false;

    if (spawnedAt === null) {
      scheduleSpawnedAt = null;
      hide();
      return;
    }

    if (spawnedAt !== scheduleSpawnedAt) {
      scheduleSpawnedAt = spawnedAt;
      scheduleLocalStartedAt = spawnedAt - clockOffsetMs;
    }

    const spawnMs = SPACE_BOSS_SPAWN.totalSeconds * 1000;
    const isSpawning = nowMs - scheduleLocalStartedAt < spawnMs;

    placeAtHome();
    state.phase = isSpawning ? "spawn" : "idle";
    state.attack = null;
    state.phaseStartedAt = isSpawning ? scheduleLocalStartedAt : scheduleLocalStartedAt + spawnMs;
    state.speed = 0;
    state.lastHitAt = undefined;
  };

  const sampleWire = (
    current: SpaceBossWire,
    nowMs: number,
    clockOffsetMs: number,
    deltaSeconds: number,
  ): void => {
    state.phase = current.phase;
    state.attack = current.attack;
    state.phaseStartedAt = current.phaseStartedAt - clockOffsetMs;
    state.attackOriginX = current.attackOriginX;
    state.attackOriginZ = current.attackOriginZ;
    state.speed = current.speed;
    state.lastHitAt = lastHitAt;

    if (current.attack === "charge") {
      // 돌진은 이동표가 정해져 있어 서버 틱을 기다릴 필요가 없음. 예고 띠와 같은 식이라 딱 맞음.
      const travel = resolveBossChargeTravel((nowMs - state.phaseStartedAt) / 1000);

      state.yaw = current.yaw;
      state.x = current.attackOriginX - Math.sin(current.yaw) * travel;
      state.z = current.attackOriginZ - Math.cos(current.yaw) * travel;
      wasFollowingWire = true;
      return;
    }

    const spinPosition =
      isSpinWire(current) && current.spinPath
        ? resolveBossSpinPosition(current.spinPath, nowMs + clockOffsetMs)
        : null;

    if (spinPosition && wasFollowingWire) {
      // 구간이 정해져 있어 서버 틱을 기다릴 필요가 없음. 서버도 같은 식으로 판정 자리를 구함.
      const spinFollow = 1 - Math.exp(-SPIN_FOLLOW_RATE * deltaSeconds);

      state.x += (spinPosition.x - state.x) * spinFollow;
      state.z += (spinPosition.z - state.z) * spinFollow;
      state.yaw +=
        resolveYawGap(current.yaw, state.yaw) * (1 - Math.exp(-FOLLOW_RATE * deltaSeconds));
      return;
    }

    let targetX: number;
    let targetZ: number;

    if (isSpinWire(current)) {
      const spinRatio = Math.min(
        1,
        Math.max(0, (nowMs - wireReceivedAt) / SPACE_NETWORK_INTERVAL_MS),
      );

      targetX = spinFromX + (current.x - spinFromX) * spinRatio;
      targetZ = spinFromZ + (current.z - spinFromZ) * spinRatio;
    } else {
      // 서버 시각을 알면 프레임이 오는 데 걸린 시간까지 쳐서 앞질러 그림.
      const wireAgeMs =
        wireServerAt === null ? nowMs - wireReceivedAt : nowMs + clockOffsetMs - wireServerAt;
      const predictionSeconds = Math.min(MAXIMUM_PREDICTION_MS, Math.max(0, wireAgeMs)) / 1000;

      targetX = current.x + wireVelocityX * predictionSeconds;
      targetZ = current.z + wireVelocityZ * predictionSeconds;
    }

    const distance = Math.hypot(targetX - state.x, targetZ - state.z);

    if (!wasFollowingWire || distance > SNAP_DISTANCE) {
      state.x = targetX;
      state.z = targetZ;
      state.yaw = current.yaw;
      wasFollowingWire = true;
      return;
    }

    const follow = 1 - Math.exp(-FOLLOW_RATE * deltaSeconds);

    state.x += (targetX - state.x) * follow;
    state.z += (targetZ - state.z) * follow;
    state.yaw += resolveYawGap(current.yaw, state.yaw) * follow;
  };

  return {
    state,
    reset: (welcome) => {
      isEnabled = welcome !== null;
      lastKilledAt = welcome?.lastKilledAt ?? null;
      wire = welcome?.wire ?? null;
      wireReceivedAt = welcome?.nowMs ?? 0;
      wireServerAt = null;
      wireVelocityX = 0;
      wireVelocityZ = 0;
      health = wire?.health ?? null;
      lastHitAt = undefined;
      wasFollowingWire = false;
      scheduleSpawnedAt = null;
      announcedSpawnedAt = null;
      hide();
    },
    applyWire: (nextWire, nowMs, serverAt) => {
      if (!isEnabled) {
        return;
      }

      const spanMs = serverAt !== undefined && wireServerAt !== null ? serverAt - wireServerAt : 0;
      const canResolveVelocity =
        wire !== null &&
        isPredictableWire(wire) &&
        isPredictableWire(nextWire) &&
        spanMs >= VELOCITY_MINIMUM_SPAN_MS &&
        spanMs <= VELOCITY_MAXIMUM_SPAN_MS;

      wireVelocityX = canResolveVelocity && wire ? ((nextWire.x - wire.x) / spanMs) * 1000 : 0;
      wireVelocityZ = canResolveVelocity && wire ? ((nextWire.z - wire.z) / spanMs) * 1000 : 0;
      wireServerAt = serverAt ?? null;

      const isSameSpin =
        wire !== null &&
        isSpinWire(wire) &&
        isSpinWire(nextWire) &&
        wire.phaseStartedAt === nextWire.phaseStartedAt;

      spinFromX = isSameSpin && wire ? wire.x : nextWire.x;
      spinFromZ = isSameSpin && wire ? wire.z : nextWire.z;

      // 쉬러 들어간 프레임이면 싸움 상태를 내려놓음. 다음 싸움은 체력 가득에서 시작함.
      wire = isRestingWire(nextWire) ? null : nextWire;
      wireReceivedAt = nowMs;
      health = wire ? nextWire.health : null;
    },
    applyHit: (nextHealth, nowMs) => {
      if (!isEnabled) {
        return;
      }

      health = nextHealth;
      lastHitAt = nowMs;
    },
    applySpawn: (spawnedAt) => {
      if (!isEnabled) {
        return;
      }

      lastKilledAt = null;
      announcedSpawnedAt = spawnedAt;
      wire = null;
      health = null;
    },
    applyDefeat: (killedAt) => {
      lastKilledAt = killedAt;
      announcedSpawnedAt = null;
    },
    sample: (nowMs, clockOffsetMs) => {
      const deltaSeconds = Math.min(
        MAXIMUM_FRAME_SECONDS,
        Math.max(0, (nowMs - lastSampledAt) / 1000),
      );

      lastSampledAt = nowMs;

      if (!isEnabled || clockOffsetMs === null) {
        wasFollowingWire = false;
        hide();
        return state;
      }

      if (wire && nowMs - wireReceivedAt > WIRE_STALE_MS) {
        wire = null;
        health = null;
      }

      if (wire) {
        sampleWire(wire, nowMs, clockOffsetMs, deltaSeconds);
      } else {
        sampleSchedule(nowMs, clockOffsetMs);
      }

      return state;
    },
    getHealth: () => {
      if (!isEnabled || state.phase === "hidden") {
        return null;
      }

      return {
        health: health ?? SPACE_BOSS_COMBAT.maximumHealth,
        maximumHealth: wire?.maximumHealth ?? SPACE_BOSS_COMBAT.maximumHealth,
      };
    },
  };
};
