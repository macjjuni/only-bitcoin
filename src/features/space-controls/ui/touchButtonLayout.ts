/**
 * 손가락 기기 하단 버튼(채팅·발차기·점프) 크기와 자리.
 *
 * 세 버튼을 같은 크기로 맞춤. 채팅은 왼쪽 아래, 점프는 오른쪽 아래 끝, 발차기는 점프의
 * 왼쪽 위 대각선. 전에는 채팅 48 px·점프 58 px 로 달랐고 점프만 옛 72 px 버튼의 중심을
 * 지키려고 안쪽으로 밀려 있어 높이도 어긋났음.
 *
 * 채팅 버튼은 `SpaceActionBar` 의 `large`(`size-[52px]`) 클래스로 그려서 지름을 바꾸면
 * 거기도 같이 바꿔야 함.
 */
export const TOUCH_BUTTON_DIAMETER = 52;
export const TOUCH_BUTTON_ICON_SIZE = 22;
/** 화면 좌우 끝에서 띄우는 거리. */
export const TOUCH_BUTTON_EDGE = "1.5rem";
/** 화면 아래에서 띄우는 거리. 아래쪽 입력 막대 자리를 비워 둠. */
export const TOUCH_BUTTON_BOTTOM = "4.5rem";

/**
 * 발차기 버튼을 점프 버튼에서 옮기는 거리(px). 왼쪽으로 조금, 위로 크게.
 *
 * 이동 조이스틱이 화면 가로 가운데(지름 120 px)라 360 px 폭 폰에서는 오른쪽 끝에서
 * 120 px 부터 조이스틱임. 정사각 대각선(48·48)이면 발차기 왼쪽 끝이 124 px 까지 와서
 * 겹쳤음. 왼쪽 36 px 로 줄여 오른쪽 112 px 안에 둠(조이스틱과 8 px 띄움).
 */
const KICK_SHIFT_LEFT = 36;
const KICK_SHIFT_UP = 58;

const withSafeArea = (base: string, offset: number, side: "right" | "bottom"): string => {
  return `calc(${base} + ${offset}px + env(safe-area-inset-${side}))`;
};

export const TOUCH_BUTTON_BOTTOM_OFFSET = withSafeArea(TOUCH_BUTTON_BOTTOM, 0, "bottom");

export const JUMP_BUTTON_POSITION = {
  right: withSafeArea(TOUCH_BUTTON_EDGE, 0, "right"),
  bottom: TOUCH_BUTTON_BOTTOM_OFFSET,
} as const;

export const KICK_BUTTON_POSITION = {
  right: withSafeArea(TOUCH_BUTTON_EDGE, KICK_SHIFT_LEFT, "right"),
  bottom: withSafeArea(TOUCH_BUTTON_BOTTOM, KICK_SHIFT_UP, "bottom"),
} as const;
