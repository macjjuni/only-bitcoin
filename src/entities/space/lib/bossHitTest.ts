import {
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_COMBAT,
  type SpaceBossAttack,
} from "@/entities/space/model/boss";

/**
 * 보스 공격 범위 판정. 순수 함수임.
 *
 * 범위는 바닥 예고 표시와 같은 모양이고, `margin` 만큼 안쪽으로 깎아 판정함.
 * 좌표 규약은 아바타와 같음. 전방이 −Z 이고 yaw θ 의 전방은 `(−sinθ, −cosθ)` 임.
 */

export interface BossPoint {
  x: number;
  z: number;
}

/** 공격을 시작한 자리와 방향. 공격 중에는 안 바뀜. */
export interface BossAttackOrigin extends BossPoint {
  yaw: number;
}

interface LocalOffset {
  /** 보스 앞쪽이 +. */
  forward: number;
  /** 보스 오른쪽이 +. 판정은 좌우 대칭이라 부호는 안 씀. */
  side: number;
}

// region [Privates]
const toLocalOffset = (origin: BossAttackOrigin, point: BossPoint): LocalOffset => {
  const deltaX = point.x - origin.x;
  const deltaZ = point.z - origin.z;
  const forwardX = -Math.sin(origin.yaw);
  const forwardZ = -Math.cos(origin.yaw);

  return {
    forward: deltaX * forwardX + deltaZ * forwardZ,
    side: deltaX * -forwardZ + deltaZ * forwardX,
  };
};
// endregion

/** 휘두르기. 발밑에서 앞으로 펼친 부채꼴. */
export const isInsideBossSwipe = (
  origin: BossAttackOrigin,
  point: BossPoint,
  margin: number,
): boolean => {
  const { radius, fullAngle } = SPACE_BOSS_ATTACKS.swipe;
  const { forward, side } = toLocalOffset(origin, point);

  return (
    Math.hypot(forward, side) <= radius - margin &&
    Math.abs(Math.atan2(side, forward)) <= fullAngle / 2
  );
};

/** 내려찍기. 보스 앞에 중심을 둔 원. */
export const isInsideBossSlam = (
  origin: BossAttackOrigin,
  point: BossPoint,
  margin: number,
): boolean => {
  const { radius, forwardOffset } = SPACE_BOSS_ATTACKS.slam;
  const { forward, side } = toLocalOffset(origin, point);

  return Math.hypot(forward - forwardOffset, side) <= radius - margin;
};

/**
 * 돌진. 보스가 `travelFrom` 에서 `travelTo` 까지 나아가는 동안 몸이 쓸고 간 구간.
 *
 * 한 틱(0.1초)에 1 m 넘게 나아가서 그 순간 위치만 보면 사이에 선 사람을 건너뜀.
 * 앞 틱의 몸 뒤끝부터 이번 틱의 앞끝(예고 띠 자리)까지를 한 번에 봄.
 */
export const isInsideBossChargeSweep = (
  origin: BossAttackOrigin,
  point: BossPoint,
  travelFrom: number,
  travelTo: number,
  margin: number,
): boolean => {
  const { width, forwardOffset } = SPACE_BOSS_ATTACKS.charge;
  const { forward, side } = toLocalOffset(origin, point);

  return (
    forward >= travelFrom - SPACE_BOSS.bodyRadius &&
    forward <= travelTo + forwardOffset - margin &&
    Math.abs(side) <= width / 2 - margin
  );
};

/** 한 번에 판정하는 공격(휘두르기 · 내려찍기)의 범위 안인지. */
export const isInsideBossAttack = (
  attack: Exclude<SpaceBossAttack, "charge">,
  origin: BossAttackOrigin,
  point: BossPoint,
  margin: number = SPACE_BOSS_COMBAT.hitMargin,
): boolean => {
  return attack === "swipe"
    ? isInsideBossSwipe(origin, point, margin)
    : isInsideBossSlam(origin, point, margin);
};

/** 아레나 안에 서 있는지. 높이도 봄 — 발코니는 같은 x·z 위에 떠 있음. */
export const isInsideBossArena = (
  point: BossPoint & { y: number },
  margin: number = 0,
): boolean => {
  const { centerX, centerZ, floorY, radius } = SPACE_BOSS.arena;

  return (
    Math.hypot(point.x - centerX, point.z - centerZ) <= radius - margin &&
    Math.abs(point.y - floorY) <= SPACE_BOSS_COMBAT.arenaHeightTolerance
  );
};

/**
 * 유저 공격이 보스에 닿는지.
 *
 * 거리는 보스 몸통 반지름을 뺀 값으로 잼. 보스가 커서 중심 기준이면 닿지 않음.
 * 보스 쪽을 보고 있어야 함.
 */
export const canKickReachBoss = (boss: BossPoint, player: BossPoint & { yaw: number }): boolean => {
  const deltaX = boss.x - player.x;
  const deltaZ = boss.z - player.z;
  const distance = Math.hypot(deltaX, deltaZ);

  if (distance - SPACE_BOSS.bodyRadius > SPACE_BOSS_COMBAT.kickReach) {
    return false;
  }

  // 몸통 안에 서 있으면 방향을 따질 수 없음. 어디를 봐도 닿는 것으로 봄.
  if (distance < 1e-3) {
    return true;
  }

  const facing = (-Math.sin(player.yaw) * deltaX + -Math.cos(player.yaw) * deltaZ) / distance;

  return facing >= SPACE_BOSS_COMBAT.kickFacingDot;
};
