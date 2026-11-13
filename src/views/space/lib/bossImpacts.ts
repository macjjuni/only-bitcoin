import {
  resolveBossChargeTravel,
  SPACE_BOSS_ATTACKS,
  type SpaceBossAttack,
  type SpaceBossState,
} from "@/entities/space";

/**
 * 보스 공격에 맞춰 낼 연출(바닥 충격, 할퀸 자국)을 가려냄. 순수 로직임.
 *
 * 상태가 "언제 무엇을 시작했는지" 만 들고 있어서, 프레임마다 지난 시각과 지금 시각
 * 사이에 판정 시각이나 이동 구간이 끼어 있는지 봄. 그리는 일은 `BossAttackEffects` 가 함.
 */

export interface BossShockwave {
  kind: "shockwave";
  x: number;
  z: number;
  /** 다 퍼졌을 때의 반지름(m). */
  radius: number;
  /** 눈덩이를 튀길지. 발을 떼는 순간처럼 가벼운 것은 고리만 냄. */
  hasDebris: boolean;
}

export interface BossDustPuff {
  kind: "dust";
  x: number;
  z: number;
}

/** 휘두르기의 할퀸 자국. 보스가 선 자리에서 보는 방향으로 그음. */
export interface BossSlash {
  kind: "slash";
  x: number;
  z: number;
  yaw: number;
}

export type BossImpact = BossShockwave | BossDustPuff | BossSlash;

export interface BossImpactTracker {
  /** 이번 프레임에 새로 낼 연출. 없으면 빈 배열(같은 객체)을 돌려줌. */
  step: (state: SpaceBossState, nowMs: number) => readonly BossImpact[];
}

/** 돌진하는 동안 이 거리마다 발밑에 눈보라를 하나씩 남김(m). */
export const BOSS_CHARGE_DUST_SPACING = 1.1;
/**
 * 할퀸 자국을 판정 시각보다 이만큼 먼저 냄(초).
 *
 * 자국이 쓸고 지나가는 중간쯤에 판정이 떨어져야 맞은 순간과 겹쳐 보임.
 */
export const BOSS_SLASH_LEAD_SECONDS = 0.1;
/** 돌진을 시작하며 땅을 박차는 고리의 반지름(m). */
const CHARGE_LAUNCH_RADIUS = 1.8;
/** 돌진 끝에 멈춰 서며 내는 고리의 반지름(m). */
const CHARGE_ARRIVAL_RADIUS = 2.6;

const NO_IMPACTS: readonly BossImpact[] = [];

export const createBossImpactTracker = (): BossImpactTracker => {
  /** 보고 있는 공격의 지문. 바뀌면 새 공격임. */
  let signature = "";
  /** 직전 프레임까지 진행한 공격 시간(초). */
  let previousSeconds = 0;

  const collectCharge = (
    state: SpaceBossState,
    elapsedSeconds: number,
    impacts: BossImpact[],
  ): void => {
    const { launchSeconds, travel } = SPACE_BOSS_ATTACKS.charge;
    const forwardX = -Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    const travelFrom = resolveBossChargeTravel(previousSeconds);
    const travelTo = resolveBossChargeTravel(elapsedSeconds);

    if (previousSeconds < launchSeconds && elapsedSeconds >= launchSeconds) {
      impacts.push({
        kind: "shockwave",
        x: state.attackOriginX,
        z: state.attackOriginZ,
        radius: CHARGE_LAUNCH_RADIUS,
        hasDebris: false,
      });
    }

    // 이번 프레임에 지나간 구간 안의 자리마다 하나씩. 프레임이 밀려도 빠뜨리지 않음.
    const firstIndex = Math.floor(travelFrom / BOSS_CHARGE_DUST_SPACING) + 1;
    const lastIndex = Math.floor(travelTo / BOSS_CHARGE_DUST_SPACING);

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const distance = index * BOSS_CHARGE_DUST_SPACING;

      impacts.push({
        kind: "dust",
        x: state.attackOriginX + forwardX * distance,
        z: state.attackOriginZ + forwardZ * distance,
      });
    }

    if (travelFrom < travel && travelTo >= travel) {
      impacts.push({
        kind: "shockwave",
        x: state.attackOriginX + forwardX * travel,
        z: state.attackOriginZ + forwardZ * travel,
        radius: CHARGE_ARRIVAL_RADIUS,
        hasDebris: true,
      });
    }
  };

  const collectSlam = (
    state: SpaceBossState,
    elapsedSeconds: number,
    impacts: BossImpact[],
  ): void => {
    const { hitSeconds, forwardOffset, radius } = SPACE_BOSS_ATTACKS.slam;

    if (previousSeconds < hitSeconds && elapsedSeconds >= hitSeconds) {
      impacts.push({
        kind: "shockwave",
        // 예고 원과 같은 자리. 보스 앞 `forwardOffset` 임.
        x: state.attackOriginX - Math.sin(state.yaw) * forwardOffset,
        z: state.attackOriginZ - Math.cos(state.yaw) * forwardOffset,
        radius,
        hasDebris: true,
      });
    }
  };

  const collectSwipe = (
    state: SpaceBossState,
    elapsedSeconds: number,
    impacts: BossImpact[],
  ): void => {
    const slashSeconds = SPACE_BOSS_ATTACKS.swipe.hitSeconds - BOSS_SLASH_LEAD_SECONDS;

    if (previousSeconds < slashSeconds && elapsedSeconds >= slashSeconds) {
      impacts.push({
        kind: "slash",
        x: state.attackOriginX,
        z: state.attackOriginZ,
        yaw: state.yaw,
      });
    }
  };

  const step = (state: SpaceBossState, nowMs: number): readonly BossImpact[] => {
    const attack: SpaceBossAttack | null = state.phase === "attack" ? state.attack : null;

    if (!attack) {
      signature = "";
      return NO_IMPACTS;
    }

    const elapsedSeconds = (nowMs - state.phaseStartedAt) / 1000;
    const nextSignature = `${attack}:${state.phaseStartedAt}`;

    if (nextSignature !== signature) {
      // 처음 본 공격은 지금부터 봄. 도중에 들어왔을 때 지나간 충격을 뒤늦게 내지 않음.
      signature = nextSignature;
      previousSeconds = elapsedSeconds;
      return NO_IMPACTS;
    }

    const impacts: BossImpact[] = [];

    if (attack === "slam") {
      collectSlam(state, elapsedSeconds, impacts);
    } else if (attack === "charge") {
      collectCharge(state, elapsedSeconds, impacts);
    } else {
      collectSwipe(state, elapsedSeconds, impacts);
    }

    previousSeconds = elapsedSeconds;

    return impacts.length > 0 ? impacts : NO_IMPACTS;
  };

  return { step };
};
