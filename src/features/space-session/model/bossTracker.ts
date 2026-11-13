import {
  createHiddenBossState,
  resolveBossChargeTravel,
  resolveBossSpawnedAt,
  SPACE_BOSS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_SPAWN,
  type SpaceBossState,
  type SpaceBossWire,
} from "@/entities/space";

/**
 * 서버가 보낸 보스 정보를 화면에 그릴 상태로 바꿈.
 *
 * 두 가지 출처를 이어 붙임.
 * - **싸우는 중**: 서버가 100 ms 마다 보내는 `boss` 프레임. 10 Hz 를 그대로 그리면 끊겨
 *   보여서 위치·방향을 부드럽게 따라감.
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
  applyWire: (wire: SpaceBossWire, nowMs: number) => void;
  /** 누가 보스를 맞힘. 움찔 연출과 체력에 반영함. */
  applyHit: (health: number, nowMs: number) => void;
  /** 처치됨. 다음 젠 시각까지 없는 것으로 계산함. */
  applyDefeat: (killedAt: number) => void;
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
    const spawnedAt = resolveBossSpawnedAt(nowMs + clockOffsetMs, lastKilledAt);

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

    const distance = Math.hypot(current.x - state.x, current.z - state.z);

    if (!wasFollowingWire || distance > SNAP_DISTANCE) {
      state.x = current.x;
      state.z = current.z;
      state.yaw = current.yaw;
      wasFollowingWire = true;
      return;
    }

    const follow = 1 - Math.exp(-FOLLOW_RATE * deltaSeconds);

    state.x += (current.x - state.x) * follow;
    state.z += (current.z - state.z) * follow;
    state.yaw += resolveYawGap(current.yaw, state.yaw) * follow;
  };

  return {
    state,
    reset: (welcome) => {
      isEnabled = welcome !== null;
      lastKilledAt = welcome?.lastKilledAt ?? null;
      wire = welcome?.wire ?? null;
      wireReceivedAt = welcome?.nowMs ?? 0;
      health = wire?.health ?? null;
      lastHitAt = undefined;
      wasFollowingWire = false;
      scheduleSpawnedAt = null;
      hide();
    },
    applyWire: (nextWire, nowMs) => {
      if (!isEnabled) {
        return;
      }

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
    applyDefeat: (killedAt) => {
      lastKilledAt = killedAt;
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
