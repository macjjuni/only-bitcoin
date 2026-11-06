import type { LocalPlayerState, SpaceTerrain } from "@/entities/space";
import { createFlatTerrain, SPACE_BOUNDS, SPACE_KICK } from "@/entities/space";

/**
 * 지형이 아직 없을 때 쓰는 대체 평지.
 *
 * GLB 가 도착하기 전 한두 프레임과 단위 테스트가 씀. 모듈 수준에 한 번만
 * 만들어 둠 — 매 스텝 새로 만들면 초당 60번 객체를 버림.
 */
const FALLBACK_TERRAIN: SpaceTerrain = createFlatTerrain();

/** 이동 튜닝 값. 근거는 `docs/btc-space-3d.md` §5 에 있음. */
export const SPACE_MOVEMENT = {
  fixedTimeStep: 1 / 60,
  /** 프레임이 길어졌을 때 따라잡는 스텝 상한. 초과분은 버림. */
  maxCatchUpSteps: 5,
  walkSpeed: 4.5,
  runSpeed: 8,
  acceleration: 25,
  deceleration: 30,
  maxYawRate: 12,
  /** 이 속력 미만에서는 캐릭터 방향을 돌리지 않음. 정지 직전 떨림 방지. */
  yawUpdateSpeedThreshold: 0.1,
  /**
   * 점프 초기 속도(m/s)와 중력(m/s²).
   *
   * 정점 `v²/2g` = 1.13 m, 체공 `2v/g` = 0.75 초임. 키 1.81 m 기준으로 무릎보다
   * 조금 높이 뜨는 정도임. 섬에서는 이 정점이 **오를 수 없는 턱의 하한**이기도
   * 함. 1.13 m 보다 낮은 난간은 뛰어 넘을 수 있음.
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
   * 누르고 있으면 착지할 때마다 다시 뜀. 누름 순간만 잡으려면 입력 계층에
   * 상태를 더 둬야 하는데, 복셀 게임에서는 연속 점프가 흔한 조작임.
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

/** -π ~ π 범위로 접음. */
const normalizeAngle = (angle: number): number => {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
};

/**
 * 입력 벡터를 카메라 yaw 기준 월드 방향으로 바꿈.
 *
 * 전방은 `-Z` 기준이라 yaw θ 의 전방은 `(-sinθ, -cosθ)`, 오른쪽은 `(cosθ, -sinθ)` 임.
 * 대각 입력은 크기를 1 로 깎아 대각선이 더 빨라지는 버그를 막음.
 */
const resolveMoveDirection = (
  input: MovementInput,
  cameraYaw: number,
): { x: number; z: number; magnitude: number } => {
  const rawMagnitude = Math.hypot(input.forward, input.strafe);

  if (rawMagnitude === 0) {
    return { x: 0, z: 0, magnitude: 0 };
  }

  // 방향은 원래 크기로 정규화해 단위 벡터를 만들고, 속력 배율만 1 로 깎음.
  // 깎은 크기로 정규화하면 대각 입력에서 방향 벡터가 √2 배로 길어짐.
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

/** 현재 속도를 목표 속도로 비율 제한하며 당김. */
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

/**
 * 벽 법선 쪽으로 파고드는 속도 성분만 지움.
 *
 * 벽에 부딪혔다고 속도를 통째로 지우면 비스듬히 다가간 벽에서 그 자리에 섬.
 * 법선 성분만 빼면 남는 접선 성분이 벽을 따라 미끄러짐 — 좁은 통로나 계단
 * 난간을 스치며 지나갈 때 걸리는 느낌이 사라짐.
 *
 * `pushX/pushZ` 는 벽이 밀어낸 방향(바깥쪽 법선)이라, 속도가 그 **반대로**
 * 향할 때만 지움. 이미 벽에서 멀어지는 중이면 건드리지 않음.
 */
const slideAlongWall = (
  velocityX: number,
  velocityZ: number,
  pushX: number,
  pushZ: number,
): { x: number; z: number } => {
  const intoWall = velocityX * pushX + velocityZ * pushZ;

  if (intoWall >= 0) {
    return { x: velocityX, z: velocityZ };
  }

  return { x: velocityX - intoWall * pushX, z: velocityZ - intoWall * pushZ };
};

/** 속도 방향으로 캐릭터 yaw 를 회전 속도 상한 안에서 돌림. */
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
 * 누적 시간을 고정 타임스텝으로 쪼갬.
 *
 * 탭 복귀처럼 프레임 간격이 크게 벌어진 경우 `maxCatchUpSteps` 까지만 처리하고
 * 나머지는 버림. 버리지 않으면 복귀 직후 캐릭터가 순간이동함.
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
 * 수직 속도와 높이를 적분함.
 *
 * 지면 높이는 평평한 바닥(0)이 아니라 **발 아래 지형면**임. 계단 한 칸처럼
 * 낮은 턱은 `groundY` 가 올라오면서 자연히 올라서지고, 가장자리에서 벗어나면
 * `groundY` 가 뚝 떨어져 그대로 떨어짐. 떨어지는 중에는 다시 올라설 수 없게
 * 중력만 받는다(§5.1).
 *
 * `ceilingY` 는 머리 위 천장임. 궁전 안에서 뛰었을 때 천장을 뚫고 나가지
 * 않도록 상승을 끊음 — 뚫고 나가면 지붕 위에 서게 되고, 거기서는 내려올
 * 길이 없어 갇힘.
 */
const stepJump = (
  y: number,
  velocityY: number,
  isJumping: boolean,
  deltaSeconds: number,
  groundY: number,
  ceilingY: number,
): { y: number; velocityY: number; isGrounded: boolean } => {
  const isGrounded = y <= groundY && velocityY <= 0;

  if (isGrounded && !isJumping) {
    return { y: groundY, velocityY: 0, isGrounded: true };
  }

  const launched = isGrounded ? SPACE_MOVEMENT.jumpSpeed : velocityY;
  const nextVelocityY = launched - SPACE_MOVEMENT.gravity * deltaSeconds;
  const nextY = y + nextVelocityY * deltaSeconds;

  if (nextY <= groundY) {
    return { y: groundY, velocityY: 0, isGrounded: true };
  }

  // 천장에 닿으면 올라가던 속도를 지움. 남겨두면 다음 스텝에 다시 밀어 올림.
  return nextY >= ceilingY
    ? { y: ceilingY, velocityY: 0, isGrounded: false }
    : { y: nextY, velocityY: nextVelocityY, isGrounded: false };
};

/**
 * 고정 타임스텝 한 번 분량의 이동을 적분함.
 *
 * `terrain` 은 지형 질의임. 넘기지 않으면 광장 높이의 평지로 봄 — GLB 가
 * 도착하기 전 첫 프레임과 단위 테스트가 그 경로를 탐.
 */
export const stepMovement = (
  state: LocalPlayerState,
  input: MovementInput,
  cameraYaw: number,
  deltaSeconds: number = SPACE_MOVEMENT.fixedTimeStep,
  terrain: SpaceTerrain = FALLBACK_TERRAIN,
): LocalPlayerState => {
  // 세게 밀리는 동안은 조작을 안 받음. 버티고 서 있으면 맞은 티가 안 남.
  const knockbackSpeed = Math.hypot(state.knockbackX, state.knockbackZ);
  const isStaggered = knockbackSpeed > SPACE_KICK.knockbackControlResumeSpeed;
  const direction = isStaggered
    ? { x: 0, z: 0, magnitude: 0 }
    : resolveMoveDirection(input, cameraYaw);
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
  const knockbackDecay = Math.exp(-SPACE_KICK.knockbackDamping * deltaSeconds);
  const knockbackX = knockbackSpeed < 0.05 ? 0 : state.knockbackX * knockbackDecay;
  const knockbackZ = knockbackSpeed < 0.05 ? 0 : state.knockbackZ * knockbackDecay;
  const rawX = state.x + (velocity.x + knockbackX) * deltaSeconds;
  const rawZ = state.z + (velocity.z + knockbackZ) * deltaSeconds;
  const boundedX = clamp(rawX, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX);
  const boundedZ = clamp(rawZ, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ);
  // 벽을 파고든 만큼 되밀어냄. 바깥 상자 클램프 다음에 둬야 상자 모서리와
  // 지형 사이 좁은 틈에서 상자 밖으로 밀려나지 않음.
  const resolved = terrain.resolveMove(boundedX, boundedZ, state.y);
  // 바깥 상자에 막힌 축은 통째로 지우고, 지형 벽은 법선 성분만 지움.
  const bounded = {
    x: boundedX === rawX ? velocity.x : 0,
    z: boundedZ === rawZ ? velocity.z : 0,
  };
  const slid = slideAlongWall(bounded.x, bounded.z, resolved.pushX, resolved.pushZ);
  // 넉백도 같은 벽 규칙을 따름. 벽으로 밀리면 그 성분만 사라지고 벽을 따라 미끄러짐.
  const knockbackSlid = slideAlongWall(
    boundedX === rawX ? knockbackX : 0,
    boundedZ === rawZ ? knockbackZ : 0,
    resolved.pushX,
    resolved.pushZ,
  );
  const velocityX = slid.x;
  const velocityZ = slid.z;
  const x = resolved.x;
  const z = resolved.z;
  // 천장은 **올라가는 중에만** 물음. 서 있거나 떨어지는 동안에는 쓸 일이
  // 없는데, 레이캐스트는 스텝마다 도는 비용이라 공짜가 아님.
  const isRising = state.velocityY > 0 || input.isJumping;
  const ceilingY = isRising ? terrain.resolveCeilingY(x, z, state.y) : Number.POSITIVE_INFINITY;
  const jump = stepJump(
    state.y,
    state.velocityY,
    input.isJumping,
    deltaSeconds,
    terrain.resolveGroundY(x, z, state.y),
    ceilingY,
  );

  return {
    x,
    z,
    y: jump.y,
    yaw: approachYaw(state.yaw, velocityX, velocityZ, deltaSeconds),
    velocityX,
    velocityZ,
    velocityY: jump.velocityY,
    isRunning: input.isRunning && direction.magnitude > 0,
    isGrounded: jump.isGrounded,
    knockbackX: knockbackSlid.x,
    knockbackZ: knockbackSlid.z,
  };
};

/**
 * 발차기에 맞은 상태로 바꿈.
 *
 * `directionX/Z` 는 찬 사람에서 맞은 사람 쪽 방향이고 서버가 정규화해 보냄. 땅에
 * 서 있으면 살짝 띄움. 이미 공중이면 수직 속도는 건드리지 않음(점프 중에 맞아도
 * 갑자기 더 높이 뜨지 않게).
 *
 * 아직 밀리는 중이면 넉백을 **더함**. 여럿이 몰아 차면 합쳐진 방향으로 더 멀리
 * 밀리고, 양쪽에서 차면 상쇄됨. 크기는 `knockbackMaxSpeed` 로 자름.
 */
export const applyKnockback = (
  state: LocalPlayerState,
  directionX: number,
  directionZ: number,
): LocalPlayerState => {
  const length = Math.hypot(directionX, directionZ);

  if (!Number.isFinite(length) || length === 0) {
    return state;
  }

  const addedX = state.knockbackX + (directionX / length) * SPACE_KICK.knockbackSpeed;
  const addedZ = state.knockbackZ + (directionZ / length) * SPACE_KICK.knockbackSpeed;
  const addedSpeed = Math.hypot(addedX, addedZ);
  const scale =
    addedSpeed > SPACE_KICK.knockbackMaxSpeed ? SPACE_KICK.knockbackMaxSpeed / addedSpeed : 1;

  return {
    ...state,
    knockbackX: addedX * scale,
    knockbackZ: addedZ * scale,
    velocityY: state.isGrounded ? SPACE_KICK.knockbackHopSpeed : state.velocityY,
    isGrounded: false,
  };
};
