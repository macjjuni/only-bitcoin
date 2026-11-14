import { resolveAvatarModel } from "@/entities/space";

/**
 * 무기를 휘두를 때 남는 궤적.
 *
 * 맥시크루와 버거빠따킹은 뼈대와 공격 모션이 같음. 무기 끝이 오른쪽 뒤에서 앞을 지나
 * 왼쪽 아래로 가로지름(모션의 40 ~ 54 % 구간). 궤적은 그 길을 따라 그리고, 무기에 따라
 * 굵기·색·남는 시간을 다르게 함. 보기만 하는 연출이라 판정과 무관함.
 */

export interface SwingTrailStyle {
  color: string;
  /** 궤적이 지나는 반지름(m). 무기 끝이 그리는 원에 맞춤. */
  radius: number;
  /** 가장 굵은 곳의 반폭(m). */
  halfWidth: number;
  /** 궤적 한 줄의 길이(rad). 머리 뒤로 이만큼 꼬리가 남음. */
  arcAngle: number;
  /** 오른쪽이 높고 왼쪽이 낮게 기울인 각도(rad). 내려치는 정도임. */
  tiltAngle: number;
  /** 궤적 가운데의 높이(m). 발바닥 기준. */
  centerHeight: number;
  /** 다 휘두른 뒤 사라지는 데 걸리는 시간(초). */
  fadeSeconds: number;
  /** 사라지는 동안 커지는 비율. 묵직한 무기일수록 크게 번짐. */
  growth: number;
  /** 바깥 가장자리를 톱니로 만들지. 철조망 방망이에 씀. */
  isJagged: boolean;
}

export interface SwingTrailPose {
  /** 궤적 머리의 방향(rad). 앞이 0 이고 오른쪽이 +. */
  headAngle: number;
  opacity: number;
  scale: number;
}

/** 모션에서 무기가 앞을 가로지르는 구간. 공격 모션 전체를 1 로 본 비율과 머리 방향(rad). */
export const SWING_TRAIL_WINDOW = {
  startRatio: 0.4,
  endRatio: 0.54,
  headFromAngle: (55 * Math.PI) / 180,
  headToAngle: (-90 * Math.PI) / 180,
} as const;

/** 모델 `id` 별 궤적. 없는 모델은 궤적을 안 그림. */
const SWING_TRAIL_STYLES: Readonly<Record<string, SwingTrailStyle>> = {
  // 렌치. 가볍고 빠른 쇠붙이라 가늘고 차가운 색으로 짧게 번쩍임.
  redcrew: {
    color: "#6fd0ff",
    radius: 1.15,
    halfWidth: 0.075,
    arcAngle: (115 * Math.PI) / 180,
    tiltAngle: (24 * Math.PI) / 180,
    centerHeight: 1.05,
    fadeSeconds: 0.16,
    growth: 0.06,
    isJagged: false,
  },
  // 철조망 방망이. 느리고 묵직해서 굵고 뜨거운 색으로 오래 남고, 가시처럼 가장자리가 거침.
  nightshift: {
    color: "#ff6a2b",
    radius: 1.3,
    halfWidth: 0.2,
    arcAngle: (135 * Math.PI) / 180,
    tiltAngle: (11 * Math.PI) / 180,
    centerHeight: 1.15,
    fadeSeconds: 0.3,
    growth: 0.16,
    isJagged: true,
  },
};

export const SWING_TRAIL_STYLE_IDS = Object.keys(SWING_TRAIL_STYLES);

/** 그 모델의 궤적 모양. 궤적이 없는 모델이면 `null`. */
export const resolveSwingTrailStyle = (modelIndex: number): SwingTrailStyle | null => {
  return SWING_TRAIL_STYLES[resolveAvatarModel(modelIndex).id] ?? null;
};

export const resolveSwingTrailStyleById = (modelId: string): SwingTrailStyle | null => {
  return SWING_TRAIL_STYLES[modelId] ?? null;
};

const easeOutCubic = (ratio: number): number => 1 - (1 - ratio) ** 3;

/**
 * 공격을 시작한 뒤 `elapsedSeconds` 가 지났을 때의 궤적. 안 보일 때는 `null`.
 *
 * 시작 시각만으로 구해서 남의 공격을 늦게 받아도 모션과 같은 지점을 그림.
 *
 * @param attackSeconds 공격 모션을 트는 길이(초). 캐릭터마다 다름.
 */
export const resolveSwingTrailPose = (
  style: SwingTrailStyle,
  attackSeconds: number,
  elapsedSeconds: number,
): SwingTrailPose | null => {
  const { startRatio, endRatio, headFromAngle, headToAngle } = SWING_TRAIL_WINDOW;
  const sweepStartSeconds = attackSeconds * startRatio;
  const sweepEndSeconds = attackSeconds * endRatio;

  if (elapsedSeconds < sweepStartSeconds || elapsedSeconds >= sweepEndSeconds + style.fadeSeconds) {
    return null;
  }

  const sweepRatio = Math.min(
    1,
    (elapsedSeconds - sweepStartSeconds) / (sweepEndSeconds - sweepStartSeconds),
  );
  const fadeRatio = Math.max(0, (elapsedSeconds - sweepEndSeconds) / style.fadeSeconds);

  return {
    headAngle: headFromAngle + (headToAngle - headFromAngle) * sweepRatio,
    opacity: (1 - fadeRatio) ** 2,
    scale: 1 + style.growth * easeOutCubic(fadeRatio),
  };
};
