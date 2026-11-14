/**
 * 손가락 기기 하단 버튼(채팅·발차기·점프) 크기와 자리.
 *
 * 세 버튼을 같은 크기로 맞춤. 채팅은 왼쪽 아래, 발차기는 오른쪽 아래 끝, 점프는 발차기
 * 바로 위. 가장 자주 누르는 발차기를 엄지가 쉬는 맨 아래에 두고 둘을 세로 한 줄로 세움.
 * 전에는 점프가 아래 끝, 발차기가 그 왼쪽 위 대각선이었음.
 *
 * 채팅 버튼(`SpaceActionBar` 의 `large`)도 이 지름을 받아 씀.
 */
export const TOUCH_BUTTON_DIAMETER = 52;
export const TOUCH_BUTTON_ICON_SIZE = 22;
/** 화면 좌우 끝에서 띄우는 거리. */
export const TOUCH_BUTTON_EDGE = "1.5rem";
/** 화면 아래에서 띄우는 거리. 아래쪽 입력 막대 자리를 비워 둠. */
export const TOUCH_BUTTON_BOTTOM = "5.5rem";

/**
 * 공격·점프 버튼이 같이 쓰는 겉모양.
 *
 * 위가 밝은 유리 판에 안쪽 윗선을 넣어 떠 있는 버튼처럼 보이게 함. 3D 화면 위라
 * 단색 반투명만으로는 배경에 묻혔음.
 */
export const TOUCH_BUTTON_SURFACE_CLASS =
  "absolute flex items-center justify-center rounded-full border backdrop-blur-md touch-none select-none " +
  "shadow-[0_4px_14px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] " +
  "transition-[transform,background-color,border-color] duration-100";
/** 평소 모습. */
export const TOUCH_BUTTON_IDLE_CLASS = "border-white/25 bg-gradient-to-b from-white/20 to-white/5";
/** 누르고 있는 모습. 살짝 눌려 들어가고 주황으로 물듦. */
export const TOUCH_BUTTON_PRESSED_CLASS =
  "scale-90 border-bitcoin/80 bg-gradient-to-b from-bitcoin/55 to-bitcoin/25";

/**
 * 점프 버튼을 발차기 버튼 위로 올리는 거리(px). 지름 52 에 간격 18.
 *
 * 좌우로는 안 옮김. 대각선으로 둘 때는 왼쪽으로 나온 버튼이 가운데 조이스틱과 겹쳐서
 * 좁은 폰용 한도를 따로 뒀는데, 세로 한 줄이면 오른쪽 끝에 붙어 있어 겹칠 일이 없음.
 */
const JUMP_SHIFT_UP = 70;
/**
 * 발차기·점프를 화면 오른쪽 끝에서 더 띄우는 거리(px).
 *
 * 채팅 버튼과 같은 여백(`TOUCH_BUTTON_EDGE`)만 두면 엄지를 끝까지 뻗어야 닿음. 320 px 폰에서도
 * 가운데 조이스틱 오른쪽 끝(220 px)과 12 px 떨어짐.
 */
const ACTION_SHIFT_LEFT = 12;

const withSafeArea = (base: string, offset: number, side: "right" | "bottom"): string => {
  return `calc(${base} + ${offset}px + env(safe-area-inset-${side}))`;
};

export const TOUCH_BUTTON_BOTTOM_OFFSET = withSafeArea(TOUCH_BUTTON_BOTTOM, 0, "bottom");

export const KICK_BUTTON_POSITION = {
  right: withSafeArea(TOUCH_BUTTON_EDGE, ACTION_SHIFT_LEFT, "right"),
  bottom: TOUCH_BUTTON_BOTTOM_OFFSET,
} as const;

export const JUMP_BUTTON_POSITION = {
  right: withSafeArea(TOUCH_BUTTON_EDGE, ACTION_SHIFT_LEFT, "right"),
  bottom: withSafeArea(TOUCH_BUTTON_BOTTOM, JUMP_SHIFT_UP, "bottom"),
} as const;
