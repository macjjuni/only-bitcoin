import { resolveAvatarModel, SPACE_AVATAR } from "@/entities/space";

/**
 * 명찰·말풍선 배치 값.
 *
 * 둘 다 `<Html>` 이라 CSS px 가 화면 높이·`distanceFactor` 에 따라 다르게 보임. 그래서
 * 말풍선은 월드 높이로 띄우지 않고 명찰과 같은 기준점에서 CSS px 로 올림. 기기마다
 * 둘 사이가 벌어지거나 겹치지 않게 하려는 것.
 */

/**
 * 머리 중심에서 명찰 중심까지 높이(m). 말풍선도 이 점에 붙음.
 *
 * 명찰 아래에 체력바(`SelfHealthBar`)가 붙어서 0.55 에서 올림. 그대로면 체력바가 머리에 닿음.
 */
export const NAMEPLATE_HEAD_OFFSET_Y = 0.65;
export const DESKTOP_NAMEPLATE_DISTANCE_FACTOR = 18;
export const TOUCH_NAMEPLATE_DISTANCE_FACTOR = 12;
/** 명찰 알약 높이(px). 명찰이 `h-5` 로 이 값에 고정됨. */
export const NAMEPLATE_HEIGHT_PX = 20;

/** 말풍선은 읽혀야 해서 터치에서도 줄이지 않음. */
export const BUBBLE_DISTANCE_FACTOR = 18;
/** 명찰 윗변과 말풍선 꼬리 끝 사이(명찰 px). */
const BUBBLE_GAP_PX = 4;
/** 말풍선 상자 아래로 나온 꼬리 길이(말풍선 px). `-bottom-1.5` 와 같음. */
export const BUBBLE_TAIL_PX = 6;

/** 모델 머리 위 명찰 기준점 높이(m). 페페처럼 키가 작은 모델은 낮게 뜸. */
export const resolveNameplateLiftY = (modelIndex: number): number => {
  return resolveAvatarModel(modelIndex).headCenterY * SPACE_AVATAR.scale + NAMEPLATE_HEAD_OFFSET_Y;
};

export const resolveNameplateDistanceFactor = (isCoarsePointer: boolean): number => {
  return isCoarsePointer ? TOUCH_NAMEPLATE_DISTANCE_FACTOR : DESKTOP_NAMEPLATE_DISTANCE_FACTOR;
};

/**
 * 명찰 기준점에서 말풍선 아랫변까지 올릴 거리(말풍선 px).
 *
 * 명찰 px 를 말풍선 px 로 바꾸려면 두 배율 비를 곱해야 함. 터치에서는 명찰이
 * 말풍선보다 작게(12/18) 그려지므로 그만큼 덜 올림.
 */
export const resolveBubbleLiftPx = (isCoarsePointer: boolean): number => {
  const nameplateToBubble =
    resolveNameplateDistanceFactor(isCoarsePointer) / BUBBLE_DISTANCE_FACTOR;

  return BUBBLE_TAIL_PX + (NAMEPLATE_HEIGHT_PX / 2 + BUBBLE_GAP_PX) * nameplateToBubble;
};
