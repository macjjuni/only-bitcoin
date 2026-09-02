import type { VenueId } from "@/entities/order-flow";

/** 효과 밀도. 기기 성능과 취향에 따라 활성 객체 수를 조절한다. */
export type EffectDensity = "low" | "medium" | "high";

/**
 * 화면 조작 상태 한 벌.
 *
 * 전장은 항상 세 거래소를 합친 통합 뷰다. 거래소 하나만 떼어 보는 모드는 두지 않는다.
 * 호가벽과 체결 효과는 이 화면의 본체라 끄고 켜는 대상이 아니어서 상태로 두지 않는다.
 * `effectDensity` · `isPaused` · `isDiagnosticsOpen` 은 개발용 조작이라 `WarDevControls`
 * 에서만 바뀐다. 운영 빌드에는 그 블록이 없으므로 각각 기본값에 머문다.
 */
export interface WarControlState {
  isPaused: boolean;
  effectDensity: EffectDensity;
  isDiagnosticsOpen: boolean;
}

export const DEFAULT_WAR_CONTROL_STATE: WarControlState = {
  isPaused: false,
  effectDensity: "medium",
  isDiagnosticsOpen: false,
};

interface DensityProfile {
  /** 동시에 살아 있을 수 있는 유닛 수. */
  maxActiveUnitCount: number;
  /** 동시에 살아 있을 수 있는 투사체 수. */
  maxActiveProjectileCount: number;
  /** 동시에 살아 있을 수 있는 폭발 수. */
  maxActiveExplosionCount: number;
  /** 한 배치에서 거래소당 꺼내 갈 체결 수. */
  tradeDrainPerVenue: number;
  /** HUD 갱신 간격. 밀도가 높을수록 자주 갱신한다. */
  hudCommitIntervalInMs: number;
}

/**
 * 밀도별 성능 예산.
 *
 * 상한을 두지 않으면 대량 체결이 쏟아질 때 객체가 무한히 쌓여 프레임이 무너진다.
 * 모바일에서는 여기에 추가로 절반을 적용한다.
 */
export const DENSITY_PROFILES: Record<EffectDensity, DensityProfile> = {
  low: {
    maxActiveUnitCount: 90,
    maxActiveProjectileCount: 60,
    maxActiveExplosionCount: 10,
    tradeDrainPerVenue: 4,
    hudCommitIntervalInMs: 250,
  },
  medium: {
    maxActiveUnitCount: 220,
    maxActiveProjectileCount: 140,
    maxActiveExplosionCount: 20,
    tradeDrainPerVenue: 8,
    hudCommitIntervalInMs: 200,
  },
  high: {
    maxActiveUnitCount: 420,
    maxActiveProjectileCount: 260,
    maxActiveExplosionCount: 32,
    tradeDrainPerVenue: 14,
    hudCommitIntervalInMs: 100,
  },
};

/** 모바일에서 객체 한도에 곱하는 비율. */
export const MOBILE_BUDGET_RATIO = 0.5;

/** 모바일로 판정할 캔버스 폭(CSS 픽셀). */
export const MOBILE_WIDTH_THRESHOLD_IN_PX = 480;

/**
 * 거래소 구분용 보조 색상(RGB 삼원색 값).
 *
 * 캔버스에서 투명도를 섞어 써야 해서 완성된 색 문자열이 아니라 삼원색만 들고 있는다.
 * 진영 색(매수 초록·매도 빨강)과 겹치지 않는 계열로 골랐다.
 */
export const VENUE_ACCENT_RGB: Record<VenueId, string> = {
  binance: "240 185 11",
  coinbase: "59 130 246",
  upbit: "34 211 238",
};

/** 진영 색. 전역 테마의 `--up-rgb` · `--down-rgb` 와 같은 값이다. */
export const BUY_SIDE_RGB = "34 197 94";
export const SELL_SIDE_RGB = "239 68 68";

/** `"34 197 94"` 형태의 삼원색과 투명도를 캔버스가 이해하는 색 문자열로 만든다. */
export function toRgbaColor(rgbTriplet: string, alpha: number): string {
  return `rgba(${rgbTriplet.split(" ").join(", ")}, ${alpha})`;
}
