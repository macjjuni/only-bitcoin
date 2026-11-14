import { resolveAvatarModel } from "@/entities/space";

/**
 * 무기를 휘두를 때 남는 궤적.
 *
 * 맥시크루와 버거빠따킹은 뼈대와 공격 모션이 같음. 무기 끝이 오른쪽 뒤에서 앞을 지나
 * 왼쪽 아래로 가로지름(모션의 40 ~ 54 % 구간). 코인충은 뼈대가 달라 파리채를 머리 위에서
 * 앞으로 내려침(30 ~ 50 % 구간). 궤적은 그 길을 따라 그리고, 무기에 따라 굵기·색·남는
 * 시간을 다르게 함. 길은 구운 모션에서 무기 끝 자리를 뽑아 맞췄음.
 * 보기만 하는 연출이라 판정과 무관함.
 */

export interface SwingTrailStyle {
  color: string;
  /** 궤적이 지나는 반지름(m). 무기 끝이 그리는 원에 맞춤. */
  radius: number;
  /** 가장 굵은 곳의 반폭(m). */
  halfWidth: number;
  /** 궤적 한 줄의 길이(rad). 머리 뒤로 이만큼 꼬리가 남음. */
  arcAngle: number;
  /**
   * 궤적이 놓인 면을 앞뒤 축으로 기울인 각도(rad). 0 이면 수평이고 오른쪽이 올라감.
   *
   * 반의 반 바퀴면 세로로 서서, 머리 방향의 + 가 오른쪽이 아니라 위가 됨.
   */
  tiltAngle: number;
  /** 궤적이 그리는 원의 중심. 발바닥 기준 높이와, 몸 가운데에서 오른쪽·앞으로 벗어난 거리(m). */
  centerHeight: number;
  centerRight: number;
  centerForward: number;
  /** 무기가 지나가는 구간. 공격 모션 전체를 1 로 본 비율임. */
  startRatio: number;
  endRatio: number;
  /** 그 구간의 처음과 끝에서 궤적 머리의 방향(rad). 앞이 0 이고 오른쪽(세로면 위)이 +. */
  headFromAngle: number;
  headToAngle: number;
  /** 다 휘두른 뒤 사라지는 데 걸리는 시간(초). */
  fadeSeconds: number;
  /** 사라지는 동안 커지는 비율. 묵직한 무기일수록 크게 번짐. */
  growth: number;
  /** 바깥 가장자리를 톱니로 만들지. 철조망 방망이에 씀. */
  isJagged: boolean;
}

export interface SwingTrailPose {
  /** 궤적 머리의 방향(rad). 앞이 0 이고 오른쪽(세로면 위)이 +. */
  headAngle: number;
  opacity: number;
  scale: number;
}

/** 맥시크루·버거빠따킹이 같이 쓰는 가로 휘두르기 구간. 오른쪽에서 왼쪽으로 쓺. */
const SIDE_SWING = {
  centerRight: 0,
  centerForward: 0,
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
    ...SIDE_SWING,
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
    ...SIDE_SWING,
    fadeSeconds: 0.3,
    growth: 0.16,
    isJagged: true,
  },
  // 파리채. 깔짝 내려치는 느낌이라 짧은 띠가 세로로 스치고 금방 사라짐. 색은 파리채의
  // 노란색(모델 정점 색 #ffca21) 그대로임. 더 가늘고 짧게 했을 때는 거의 안 보였음.
  pepe: {
    color: "#ffca21",
    radius: 0.62,
    halfWidth: 0.11,
    arcAngle: (70 * Math.PI) / 180,
    // 세로로 세움. 머리 위에서 앞 아래로 내려침.
    tiltAngle: Math.PI / 2,
    centerHeight: 0.9,
    centerRight: 0.2,
    centerForward: 0.45,
    startRatio: 0.3,
    endRatio: 0.5,
    headFromAngle: (95 * Math.PI) / 180,
    headToAngle: (-12 * Math.PI) / 180,
    fadeSeconds: 0.14,
    growth: 0.05,
    isJagged: false,
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
  const { startRatio, endRatio, headFromAngle, headToAngle } = style;
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
