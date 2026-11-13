import {
  type LocalPlayerState,
  SPACE_BOUNDS,
  type SpaceBossAttack,
  type SpaceTerrain,
} from "@/entities/space";

/**
 * 보스 공격에 맞았을 때 뒤로 밀리는 연출.
 *
 * **내 화면에서 내 캐릭터만** 밂. 내 위치는 원래 내가 정해 서버에 보내는 값이라
 * 밀린 결과가 그대로 동기화됨. 예전 유저끼리의 넉백은 남이 나를 밀어서 내 화면의
 * 예측과 서버 결과가 어긋났는데, 여기는 서버가 "맞았다" 고 알려 준 뒤에 밀기 시작해서
 * 어긋날 상대가 없음.
 */

/**
 * 공격별 밀림. 처음 속도에서 0 까지 고르게 줄어서 밀린 거리는 `speed × seconds ÷ 2` 임.
 *
 * 처음 속도는 셋 다 8 m/s 로 묶었음. 서버의 이동 속도 상한(8.5 m/s)을 넘으면 이동이
 * 반려되고 화면이 되감김. 밀리는 동안 조작 입력을 막아서 내 걸음이 더해지지도 않음.
 * 세기 차이는 시간으로 냄: 휘두르기 1.0 m, 내려찍기 1.6 m, 돌진 3.0 m.
 */
export const SPACE_BOSS_KNOCKBACK = {
  swipe: { speed: 8, seconds: 0.25 },
  slam: { speed: 8, seconds: 0.4 },
  charge: { speed: 8, seconds: 0.75 },
} as const satisfies Record<SpaceBossAttack, { speed: number; seconds: number }>;

export interface Knockback {
  /** 밀리는 방향(단위 벡터). */
  directionX: number;
  directionZ: number;
  /** 처음 속도(m/s). */
  speed: number;
  seconds: number;
  /** 지금까지 진행한 시간(초). `stepKnockback` 이 올림. */
  elapsedSeconds: number;
}

interface KnockbackSource {
  x: number;
  z: number;
  /** 아바타와 같은 규약. 전방이 −Z 이고 yaw θ 의 전방은 `(−sinθ, −cosθ)` 임. */
  yaw: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * 맞은 공격에 맞는 밀림을 만듦.
 *
 * 휘두르기·내려찍기는 보스 반대쪽으로, 돌진은 보스가 달리는 방향으로 밀림. 돌진을
 * 보스 반대쪽으로 밀면 옆에서 스친 사람이 옆으로 튀는데, 들이받힌 느낌은 진행 방향임.
 */
export const createBossKnockback = (
  attack: SpaceBossAttack,
  boss: KnockbackSource,
  player: { x: number; z: number },
): Knockback => {
  const { speed, seconds } = SPACE_BOSS_KNOCKBACK[attack];
  const forwardX = -Math.sin(boss.yaw);
  const forwardZ = -Math.cos(boss.yaw);
  const awayX = player.x - boss.x;
  const awayZ = player.z - boss.z;
  const distance = Math.hypot(awayX, awayZ);
  // 보스와 같은 자리에 서 있으면 반대쪽이 없음. 보스가 보는 쪽으로 밂.
  const shouldUseForward = attack === "charge" || distance < 0.0001;

  return {
    directionX: shouldUseForward ? forwardX : awayX / distance,
    directionZ: shouldUseForward ? forwardZ : awayZ / distance,
    speed,
    seconds,
    elapsedSeconds: 0,
  };
};

/** 아직 밀리는 중인지. 이 동안에는 조작 입력을 받지 않음. */
export const isKnockbackActive = (knockback: Knockback | null): knockback is Knockback => {
  return knockback !== null && knockback.elapsedSeconds < knockback.seconds;
};

/**
 * 밀림을 한 걸음 진행함. `knockback.elapsedSeconds` 를 올림.
 *
 * 벽 쪽으로 밀리면 지형이 되밀어냄. 벽을 뚫지 않음.
 */
export const stepKnockback = (
  state: LocalPlayerState,
  knockback: Knockback,
  deltaSeconds: number,
  terrain: SpaceTerrain,
): LocalPlayerState => {
  const remainingSeconds = knockback.seconds - knockback.elapsedSeconds;
  const stepSeconds = Math.min(deltaSeconds, Math.max(0, remainingSeconds));

  if (stepSeconds <= 0) {
    return state;
  }

  // 이 걸음의 가운데 시점 속도로 감. 처음·끝 속도를 쓰면 걸음 길이에 따라 총 거리가 달라짐.
  const midpointSeconds = knockback.elapsedSeconds + stepSeconds / 2;
  const velocity = knockback.speed * (1 - midpointSeconds / knockback.seconds);
  const stride = velocity * stepSeconds;

  knockback.elapsedSeconds += stepSeconds;

  const resolved = terrain.resolveMove(
    clamp(state.x + knockback.directionX * stride, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX),
    clamp(state.z + knockback.directionZ * stride, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ),
    state.y,
  );

  return { ...state, x: resolved.x, z: resolved.z };
};
