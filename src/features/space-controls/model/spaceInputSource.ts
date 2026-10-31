import { createEmptyMovementInput, type MovementInput } from "./movement";

/**
 * 입력 수집 지점.
 *
 * 프레임 루프는 60 fps 로 돌기 때문에 입력을 React 상태로 들고 있으면 매 프레임
 * 리렌더가 난다. 키보드·조이스틱·포인터가 이 가변 객체에 직접 쓰고, 씬은 매
 * 프레임 읽어서 소비한다.
 *
 * 키보드와 조이스틱을 같은 필드에 쓰면 서로 값을 덮으므로 채널을 나눠 둔다.
 */
export interface SpaceInputSource {
  keyboard: MovementInput;
  joystick: MovementInput;
  /** 키보드 시야 회전 방향. -1(좌) / 0 / 1(우) */
  yawDirection: number;
  /** 아직 카메라에 반영되지 않은 포인터 드래그 누적량(px). */
  pendingDragX: number;
  pendingDragY: number;
  /** 아직 반영되지 않은 줌 누적량(m). 양수면 멀어진다. */
  pendingZoomDistance: number;
}

export const createSpaceInputSource = (): SpaceInputSource => ({
  keyboard: createEmptyMovementInput(),
  joystick: createEmptyMovementInput(),
  yawDirection: 0,
  pendingDragX: 0,
  pendingDragY: 0,
  pendingZoomDistance: 0,
});

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * 키보드와 조이스틱 입력을 하나로 합친다.
 *
 * 두 입력을 더한 뒤 각 축을 -1 ~ 1 로 깎는다. 동시에 쓰는 경우가 드물지만
 * 합산해 두면 조이스틱을 쓰다 키보드로 넘어가는 순간이 끊기지 않는다.
 */
export const resolveMergedMovementInput = (inputSource: SpaceInputSource): MovementInput => ({
  forward: clamp(inputSource.keyboard.forward + inputSource.joystick.forward, -1, 1),
  strafe: clamp(inputSource.keyboard.strafe + inputSource.joystick.strafe, -1, 1),
  isRunning: inputSource.keyboard.isRunning || inputSource.joystick.isRunning,
});

/** 누적된 드래그량을 읽고 비운다. 같은 드래그가 두 프레임에 걸쳐 적용되는 것을 막는다. */
export const consumePendingDrag = (
  inputSource: SpaceInputSource,
): { deltaX: number; deltaY: number } => {
  const deltaX = inputSource.pendingDragX;
  const deltaY = inputSource.pendingDragY;

  inputSource.pendingDragX = 0;
  inputSource.pendingDragY = 0;

  return { deltaX, deltaY };
};

/** 누적된 줌량(m)을 읽고 비운다. */
export const consumePendingZoom = (inputSource: SpaceInputSource): number => {
  const distanceDelta = inputSource.pendingZoomDistance;

  inputSource.pendingZoomDistance = 0;

  return distanceDelta;
};
