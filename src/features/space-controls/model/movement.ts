import type { LocalPlayerState } from "@/entities/space";
import { SPACE_BOUNDS } from "@/entities/space";

/** 이동 튜닝 값. 근거는 `docs/btc-space-3d.md` §5 에 있다. */
export const SPACE_MOVEMENT = {
  fixedTimeStep: 1 / 60,
  /** 프레임이 길어졌을 때 따라잡는 스텝 상한. 초과분은 버린다. */
  maxCatchUpSteps: 5,
  walkSpeed: 4.5,
  runSpeed: 8,
  acceleration: 25,
  deceleration: 30,
  maxYawRate: 12,
  /** 이 속력 미만에서는 캐릭터 방향을 돌리지 않는다. 정지 직전 떨림 방지. */
  yawUpdateSpeedThreshold: 0.1,
  /**
   * 점프 초기 속도(m/s)와 중력(m/s²).
   *
   * 정점 `v²/2g` = 1.13 m, 체공 `2v/g` = 0.75 초다. 키 1.81 m 기준으로 무릎보다
   * 조금 높이 뜨는 정도이며, 서버가 검증하는 `SPACE_MAX_JUMP_HEIGHT`(2.5 m)
   * 안에 든다.
   */
  jumpSpeed: 6,
  gravity: 16,
} as const;

export interface MovementInput {
  /** 화면 기준 전후. 양수가 전진. -1 ~ 1 */
  forward: number;
  /** 화면 기준 좌우. 양수가 오른쪽. -1 ~ 1 */
  strafe: number;
  isRunning: boolean;
  /**
   * 점프 키를 누르고 있는지.
   *
   * 누르고 있으면 착지할 때마다 다시 뛴다. 누름 순간만 잡으려면 입력 계층에
   * 상태를 더 둬야 하는데, 복셀 게임에서는 연속 점프가 흔한 조작이다.
   */
  isJumping: boolean;
}

export interface FixedStepPlan {
  stepCount: number;
  /** 다음 프레임으로 넘길 잔여 시간. */
  remainder: number;
}

export const createEmptyMovementInput = (): MovementInput => ({
  forward: 0,
  strafe: 0,
  isRunning: false,
  isJumping: false,
});

// region [Privates]
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/** -π ~ π 범위로 접는다. */
const normalizeAngle = (angle: number): number => {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
};

/**
 * 입력 벡터를 카메라 yaw 기준 월드 방향으로 바꾼다.
 *
 * 전방은 `-Z` 기준이라 yaw θ 의 전방은 `(-sinθ, -cosθ)`, 오른쪽은 `(cosθ, -sinθ)` 다.
 * 대각 입력은 크기를 1 로 깎아 대각선이 더 빨라지는 버그를 막는다.
 */
const resolveMoveDirection = (
  input: MovementInput,
  cameraYaw: number,
): { x: number; z: number; magnitude: number } => {
  const rawMagnitude = Math.hypot(input.forward, input.strafe);

  if (rawMagnitude === 0) {
    return { x: 0, z: 0, magnitude: 0 };
  }

  // 방향은 원래 크기로 정규화해 단위 벡터를 만들고, 속력 배율만 1 로 깎는다.
  // 깎은 크기로 정규화하면 대각 입력에서 방향 벡터가 √2 배로 길어진다.
  const magnitude = clamp(rawMagnitude, 0, 1);
  const normalizedForward = input.forward / rawMagnitude;
  const normalizedStrafe = input.strafe / rawMagnitude;
  const sinYaw = Math.sin(cameraYaw);
  const cosYaw = Math.cos(cameraYaw);

  return {
    x: normalizedForward * -sinYaw + normalizedStrafe * cosYaw,
    z: normalizedForward * -cosYaw + normalizedStrafe * -sinYaw,
    magnitude,
  };
};

/** 현재 속도를 목표 속도로 비율 제한하며 당긴다. */
const approachVelocity = (
  velocityX: number,
  velocityZ: number,
  targetX: number,
  targetZ: number,
  rate: number,
  deltaSeconds: number,
): { x: number; z: number } => {
  const gapX = targetX - velocityX;
  const gapZ = targetZ - velocityZ;
  const gap = Math.hypot(gapX, gapZ);
  const maxDelta = rate * deltaSeconds;

  if (gap <= maxDelta || gap === 0) {
    return { x: targetX, z: targetZ };
  }

  return {
    x: velocityX + (gapX / gap) * maxDelta,
    z: velocityZ + (gapZ / gap) * maxDelta,
  };
};

/** 속도 방향으로 캐릭터 yaw 를 회전 속도 상한 안에서 돌린다. */
const approachYaw = (
  currentYaw: number,
  velocityX: number,
  velocityZ: number,
  deltaSeconds: number,
): number => {
  if (Math.hypot(velocityX, velocityZ) < SPACE_MOVEMENT.yawUpdateSpeedThreshold) {
    return currentYaw;
  }

  const targetYaw = Math.atan2(-velocityX, -velocityZ);
  const difference = normalizeAngle(targetYaw - currentYaw);
  const maxDelta = SPACE_MOVEMENT.maxYawRate * deltaSeconds;

  if (Math.abs(difference) <= maxDelta) {
    return normalizeAngle(targetYaw);
  }

  return normalizeAngle(currentYaw + Math.sign(difference) * maxDelta);
};
// endregion

/**
 * 누적 시간을 고정 타임스텝으로 쪼갠다.
 *
 * 탭 복귀처럼 프레임 간격이 크게 벌어진 경우 `maxCatchUpSteps` 까지만 처리하고
 * 나머지는 버린다. 버리지 않으면 복귀 직후 캐릭터가 순간이동한다.
 */
export const planFixedSteps = (accumulatedSeconds: number): FixedStepPlan => {
  const { fixedTimeStep, maxCatchUpSteps } = SPACE_MOVEMENT;
  const requestedSteps = Math.floor(accumulatedSeconds / fixedTimeStep);

  if (requestedSteps <= maxCatchUpSteps) {
    return {
      stepCount: Math.max(requestedSteps, 0),
      remainder: accumulatedSeconds - Math.max(requestedSteps, 0) * fixedTimeStep,
    };
  }

  return { stepCount: maxCatchUpSteps, remainder: 0 };
};

/**
 * 수직 속도와 높이를 적분한다.
 *
 * 바닥이 평평해 지면 판정은 `y <= 0` 하나면 된다. 착지하면 높이와 수직 속도를
 * 모두 0 으로 되돌려 바닥 아래로 새지 않게 한다.
 */
const stepJump = (
  y: number,
  velocityY: number,
  isJumping: boolean,
  deltaSeconds: number,
): { y: number; velocityY: number } => {
  const isGrounded = y <= 0 && velocityY <= 0;

  if (isGrounded && !isJumping) {
    return { y: 0, velocityY: 0 };
  }

  const launched = isGrounded ? SPACE_MOVEMENT.jumpSpeed : velocityY;
  const nextVelocityY = launched - SPACE_MOVEMENT.gravity * deltaSeconds;
  const nextY = y + nextVelocityY * deltaSeconds;

  return nextY <= 0 ? { y: 0, velocityY: 0 } : { y: nextY, velocityY: nextVelocityY };
};

/** 고정 타임스텝 한 번 분량의 이동을 적분한다. */
export const stepMovement = (
  state: LocalPlayerState,
  input: MovementInput,
  cameraYaw: number,
  deltaSeconds: number = SPACE_MOVEMENT.fixedTimeStep,
): LocalPlayerState => {
  const direction = resolveMoveDirection(input, cameraYaw);
  const speed = input.isRunning ? SPACE_MOVEMENT.runSpeed : SPACE_MOVEMENT.walkSpeed;
  const rate = direction.magnitude > 0 ? SPACE_MOVEMENT.acceleration : SPACE_MOVEMENT.deceleration;
  const velocity = approachVelocity(
    state.velocityX,
    state.velocityZ,
    direction.x * speed * direction.magnitude,
    direction.z * speed * direction.magnitude,
    rate,
    deltaSeconds,
  );
  const rawX = state.x + velocity.x * deltaSeconds;
  const rawZ = state.z + velocity.z * deltaSeconds;
  const x = clamp(rawX, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX);
  const z = clamp(rawZ, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ);
  // 경계에 막힌 축의 속도를 지운다. 남겨두면 벽에 붙어 계속 밀어붙인다.
  const velocityX = x === rawX ? velocity.x : 0;
  const velocityZ = z === rawZ ? velocity.z : 0;
  const jump = stepJump(state.y, state.velocityY, input.isJumping, deltaSeconds);

  return {
    x,
    z,
    y: jump.y,
    yaw: approachYaw(state.yaw, velocityX, velocityZ, deltaSeconds),
    velocityX,
    velocityZ,
    velocityY: jump.velocityY,
    isRunning: input.isRunning && direction.magnitude > 0,
  };
};
