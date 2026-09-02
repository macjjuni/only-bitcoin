import type { TradeMagnitude, TradeSide, TradeTick, VenueId } from "@/entities/order-flow";
import { DENSITY_PROFILES, type EffectDensity, MOBILE_BUDGET_RATIO } from "../model/warViewModel";
import { ObjectPool, type PoolableObject } from "./objectPool";

/** 전선이 중앙에서 좌우로 벗어날 수 있는 최대 비율. */
const FRONT_LINE_MAX_OFFSET_RATIO = 0.32;

/** 전선 추종 시정수(ms). 클수록 느리고 부드럽게 따라간다. */
const FRONT_LINE_SMOOTHING_TAU_IN_MS = 700;

/** 유닛이 출발하는 진영 끝단 위치. */
const BUY_SPAWN_X_RATIO = 0.03;
const SELL_SPAWN_X_RATIO = 0.97;

/** 유닛이 전장 세로 방향에서 차지하는 구간. 위아래 여백을 남긴다. */
const BATTLE_FIELD_TOP_RATIO = 0.16;
const BATTLE_FIELD_BOTTOM_RATIO = 0.94;

/** 규모별 유닛 진행 속도(초당 비율)와 크기(px). */
const UNIT_SPEED_BY_MAGNITUDE: Record<TradeMagnitude, number> = {
  small: 0.17,
  medium: 0.13,
  large: 0.1,
  huge: 0.08,
};

const UNIT_SIZE_BY_MAGNITUDE: Record<TradeMagnitude, number> = {
  small: 5,
  medium: 9,
  large: 14,
  huge: 20,
};

/** 규모별로 함께 발사하는 투사체 수. */
const PROJECTILE_COUNT_BY_MAGNITUDE: Record<TradeMagnitude, number> = {
  small: 0,
  medium: 1,
  large: 2,
  huge: 3,
};

const UNIT_LIFETIME_IN_MS = 5200;
const PROJECTILE_SPEED_RATIO_PER_SECOND = 0.62;
const EXPLOSION_LIFETIME_IN_MS = 620;

/** 대형 체결이 만드는 화면 흔들림 세기와 감쇠 시간. */
const SHAKE_IMPULSE_IN_PX = 5;
const SHAKE_DECAY_TAU_IN_MS = 220;

export interface BattleUnit extends PoolableObject {
  side: TradeSide;
  venue: VenueId;
  magnitude: TradeMagnitude;
  positionXRatio: number;
  positionYRatio: number;
  speedRatioPerSecond: number;
  sizeInPx: number;
  ageInMs: number;
  /** 상하 흔들림 위상. 유닛마다 달라야 행진이 기계적으로 보이지 않는다. */
  wobblePhase: number;
  isWeakened: boolean;
}

export interface BattleProjectile extends PoolableObject {
  side: TradeSide;
  venue: VenueId;
  positionXRatio: number;
  positionYRatio: number;
  velocityYRatio: number;
  radiusInPx: number;
  ageInMs: number;
  isWeakened: boolean;
}

export interface BattleExplosion extends PoolableObject {
  side: TradeSide;
  venue: VenueId;
  positionXRatio: number;
  positionYRatio: number;
  maxRadiusInPx: number;
  ageInMs: number;
  isWeakened: boolean;
}

interface SpawnOptions {
  /** 연결이 불안정한 거래소의 효과는 약하게 그린다. */
  isWeakened: boolean;
  /** 이동과 흔들림을 최소화한다. */
  isReducedMotion: boolean;
}

function createUnit(): BattleUnit {
  return {
    isActive: false,
    side: "buy",
    venue: "binance",
    magnitude: "small",
    positionXRatio: 0,
    positionYRatio: 0,
    speedRatioPerSecond: 0,
    sizeInPx: 0,
    ageInMs: 0,
    wobblePhase: 0,
    isWeakened: false,
  };
}

function createProjectile(): BattleProjectile {
  return {
    isActive: false,
    side: "buy",
    venue: "binance",
    positionXRatio: 0,
    positionYRatio: 0,
    velocityYRatio: 0,
    radiusInPx: 0,
    ageInMs: 0,
    isWeakened: false,
  };
}

function createExplosion(): BattleExplosion {
  return {
    isActive: false,
    side: "buy",
    venue: "binance",
    positionXRatio: 0,
    positionYRatio: 0,
    maxRadiusInPx: 0,
    ageInMs: 0,
    isWeakened: false,
  };
}

/** 전장 세로 범위 안의 임의 위치. */
function pickRandomFieldYRatio(): number {
  return (
    BATTLE_FIELD_TOP_RATIO + Math.random() * (BATTLE_FIELD_BOTTOM_RATIO - BATTLE_FIELD_TOP_RATIO)
  );
}

/**
 * 2D 전투 시뮬레이션.
 *
 * 캔버스에 무엇을 그릴지만 계산하고 그리기 자체는 하지 않는다. 좌표를 픽셀이 아니라
 * 0~1 비율로 들고 있어서 창 크기가 바뀌어도 진행 중인 전투가 튀지 않는다.
 *
 * 실제 체결과 호가만 입력으로 받는다. 개별 유닛이 실제 사람이나 주문 하나를 뜻하지는
 * 않는다. 규모 등급으로 묶인 체결의 시각적 표현이다.
 */
export class BattleEngine {
  private frontLineRatio = 0.5;
  private targetFrontLineRatio = 0.5;
  private shakeIntensityInPx = 0;

  readonly unitPool = new ObjectPool<BattleUnit>(
    createUnit,
    DENSITY_PROFILES.medium.maxActiveUnitCount,
  );
  readonly projectilePool = new ObjectPool<BattleProjectile>(
    createProjectile,
    DENSITY_PROFILES.medium.maxActiveProjectileCount,
  );
  readonly explosionPool = new ObjectPool<BattleExplosion>(
    createExplosion,
    DENSITY_PROFILES.medium.maxActiveExplosionCount,
  );

  //#region [Privates]
  /** 밀도와 기기에 맞춰 객체 상한을 다시 잡는다. */
  applyBudget(effectDensity: EffectDensity, isMobile: boolean): void {
    const densityProfile = DENSITY_PROFILES[effectDensity];
    const budgetRatio = isMobile ? MOBILE_BUDGET_RATIO : 1;

    this.unitPool.setCapacity(Math.round(densityProfile.maxActiveUnitCount * budgetRatio));
    this.projectilePool.setCapacity(
      Math.round(densityProfile.maxActiveProjectileCount * budgetRatio),
    );
    this.explosionPool.setCapacity(
      Math.round(densityProfile.maxActiveExplosionCount * budgetRatio),
    );
  }

  /** 압력(-1~1)을 전선 목표 위치로 옮긴다. 매수 우세면 오른쪽으로 민다. */
  setPressure(pressure: number): void {
    this.targetFrontLineRatio = 0.5 + pressure * FRONT_LINE_MAX_OFFSET_RATIO;
  }

  getFrontLineRatio(): number {
    return this.frontLineRatio;
  }

  getShakeIntensityInPx(): number {
    return this.shakeIntensityInPx;
  }

  getActiveObjectCount(): number {
    return (
      this.unitPool.activeObjectCount +
      this.projectilePool.activeObjectCount +
      this.explosionPool.activeObjectCount
    );
  }

  clear(): void {
    this.unitPool.clear();
    this.projectilePool.clear();
    this.explosionPool.clear();
    this.shakeIntensityInPx = 0;
  }

  private spawnProjectiles(trade: TradeTick, originYRatio: number, options: SpawnOptions): void {
    const projectileCount = PROJECTILE_COUNT_BY_MAGNITUDE[trade.magnitude];

    for (let index = 0; index < projectileCount; index += 1) {
      const projectile = this.projectilePool.acquire();

      if (projectile === null) {
        return;
      }

      projectile.side = trade.aggressorSide;
      projectile.venue = trade.venue;
      projectile.positionXRatio =
        trade.aggressorSide === "buy" ? BUY_SPAWN_X_RATIO : SELL_SPAWN_X_RATIO;
      projectile.positionYRatio = originYRatio;
      projectile.velocityYRatio = options.isReducedMotion ? 0 : (Math.random() - 0.5) * 0.08;
      projectile.radiusInPx = trade.magnitude === "huge" ? 4 : 2.5;
      projectile.ageInMs = 0;
      projectile.isWeakened = options.isWeakened;
    }
  }

  private spawnExplosion(
    side: TradeSide,
    venue: VenueId,
    positionXRatio: number,
    positionYRatio: number,
    maxRadiusInPx: number,
    options: SpawnOptions,
  ): void {
    const explosion = this.explosionPool.acquire();

    if (explosion === null) {
      return;
    }

    explosion.side = side;
    explosion.venue = venue;
    explosion.positionXRatio = positionXRatio;
    explosion.positionYRatio = positionYRatio;
    explosion.maxRadiusInPx = maxRadiusInPx;
    explosion.ageInMs = 0;
    explosion.isWeakened = options.isWeakened;
  }
  //#endregion

  //#region [Transactions]
  /**
   * 체결 한 건을 전투 객체로 바꾼다.
   *
   * 규모가 클수록 큰 유닛과 많은 투사체가 나가고, 최상위 등급은 폭발까지 만든다.
   * 상한에 걸리면 조용히 건너뛴다.
   */
  spawnFromTrade(trade: TradeTick, options: SpawnOptions): void {
    const unit = this.unitPool.acquire();

    if (unit === null) {
      return;
    }

    const spawnYRatio = pickRandomFieldYRatio();

    unit.side = trade.aggressorSide;
    unit.venue = trade.venue;
    unit.magnitude = trade.magnitude;
    unit.positionXRatio = trade.aggressorSide === "buy" ? BUY_SPAWN_X_RATIO : SELL_SPAWN_X_RATIO;
    unit.positionYRatio = spawnYRatio;
    unit.speedRatioPerSecond = options.isReducedMotion
      ? UNIT_SPEED_BY_MAGNITUDE[trade.magnitude] * 0.35
      : UNIT_SPEED_BY_MAGNITUDE[trade.magnitude];
    unit.sizeInPx = UNIT_SIZE_BY_MAGNITUDE[trade.magnitude];
    unit.ageInMs = 0;
    unit.wobblePhase = Math.random() * Math.PI * 2;
    unit.isWeakened = options.isWeakened;

    this.spawnProjectiles(trade, spawnYRatio, options);

    if (trade.magnitude === "huge") {
      this.spawnExplosion(
        trade.aggressorSide,
        trade.venue,
        unit.positionXRatio,
        spawnYRatio,
        34,
        options,
      );

      if (!options.isReducedMotion && !options.isWeakened) {
        this.shakeIntensityInPx = Math.min(
          SHAKE_IMPULSE_IN_PX * 2,
          this.shakeIntensityInPx + SHAKE_IMPULSE_IN_PX,
        );
      }
    }
  }

  /**
   * 한 프레임 진행.
   *
   * 시간 기반이라 프레임 레이트가 흔들려도 속도가 같다. 백그라운드 복귀 직후처럼
   * `deltaInMs` 가 비정상적으로 크면 한 프레임 분량으로 잘라 순간이동을 막는다.
   */
  update(rawDeltaInMs: number, isReducedMotion: boolean): void {
    const deltaInMs = Math.min(100, Math.max(0, rawDeltaInMs));
    const deltaInSeconds = deltaInMs / 1000;

    const smoothingRatio = 1 - Math.exp(-deltaInMs / FRONT_LINE_SMOOTHING_TAU_IN_MS);
    this.frontLineRatio += (this.targetFrontLineRatio - this.frontLineRatio) * smoothingRatio;

    this.shakeIntensityInPx *= Math.exp(-deltaInMs / SHAKE_DECAY_TAU_IN_MS);

    if (this.shakeIntensityInPx < 0.05 || isReducedMotion) {
      this.shakeIntensityInPx = 0;
    }

    this.unitPool.forEachActive((unit) => {
      unit.ageInMs += deltaInMs;
      const travelRatio = unit.speedRatioPerSecond * deltaInSeconds;
      unit.positionXRatio += unit.side === "buy" ? travelRatio : -travelRatio;

      const hasReachedFrontLine =
        unit.side === "buy"
          ? unit.positionXRatio >= this.frontLineRatio
          : unit.positionXRatio <= this.frontLineRatio;

      if (hasReachedFrontLine || unit.ageInMs >= UNIT_LIFETIME_IN_MS) {
        this.unitPool.release(unit);
      }
    });

    this.projectilePool.forEachActive((projectile) => {
      projectile.ageInMs += deltaInMs;
      const travelRatio = PROJECTILE_SPEED_RATIO_PER_SECOND * deltaInSeconds;
      projectile.positionXRatio += projectile.side === "buy" ? travelRatio : -travelRatio;
      projectile.positionYRatio += projectile.velocityYRatio * deltaInSeconds;

      const hasReachedFrontLine =
        projectile.side === "buy"
          ? projectile.positionXRatio >= this.frontLineRatio
          : projectile.positionXRatio <= this.frontLineRatio;

      if (!hasReachedFrontLine && projectile.ageInMs < UNIT_LIFETIME_IN_MS) {
        return;
      }

      if (hasReachedFrontLine) {
        this.spawnExplosion(
          projectile.side,
          projectile.venue,
          this.frontLineRatio,
          projectile.positionYRatio,
          projectile.radiusInPx * 3.4,
          { isWeakened: projectile.isWeakened, isReducedMotion },
        );
      }

      this.projectilePool.release(projectile);
    });

    this.explosionPool.forEachActive((explosion) => {
      explosion.ageInMs += deltaInMs;

      if (explosion.ageInMs >= EXPLOSION_LIFETIME_IN_MS) {
        this.explosionPool.release(explosion);
      }
    });
  }

  /** 폭발 진행률(0~1). 렌더러가 반지름과 투명도를 뽑는 데 쓴다. */
  static getExplosionProgress(explosion: BattleExplosion): number {
    return Math.min(1, explosion.ageInMs / EXPLOSION_LIFETIME_IN_MS);
  }
  //#endregion
}
