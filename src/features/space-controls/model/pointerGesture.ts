/**
 * 포인터 제스처 해석.
 *
 * 손가락 하나는 시야 회전(좌우 yaw · 상하 피치), 둘은 줌이다. 같은 제스처가
 * 두 가지로 해석되면 조작이 뒤섞이므로 손가락 수로만 가른다.
 *
 * 이벤트 핸들러에서 분리해 둔다. 핸들러 안에 두면 검증할 방법이 없고, 실제로
 * 줌·회전이 뒤섞이는 문제가 반복됐다.
 */

export interface PointerGestureState {
  /** 화면에 닿아 있는 포인터의 마지막 위치. */
  pointers: Map<number, { clientX: number; clientY: number }>;
}

export interface PointerDragDelta {
  /** 좌우 드래그량(px). yaw 로 간다. */
  dragX: number;
  /** 상하 드래그량(px). 피치로 간다. */
  dragY: number;
}

/** 동시에 추적하는 포인터 수. 셋째 손가락은 무시한다. */
const MAX_TRACKED_POINTERS = 2;

const NO_DRAG: PointerDragDelta = { dragX: 0, dragY: 0 };

export const createPointerGestureState = (): PointerGestureState => ({
  pointers: new Map(),
});

/**
 * 두 손가락 사이 거리. 손가락이 둘이 아니면 `null`.
 *
 * 이 값의 **프레임 간 차이**가 줌이다. 포인터 이벤트는 손가락마다 따로 오므로
 * 이벤트마다 비교하면, 두 손가락을 나란히 끌어도 한쪽만 움직인 중간 상태에서
 * 거리가 변해 줌이 걸린다. 프레임마다 한 번씩 비교하면 그 시점에는 두 손가락의
 * 최신 위치가 모두 반영돼 있다.
 */
export const readPinchSpread = (state: PointerGestureState): number | null => {
  if (state.pointers.size !== MAX_TRACKED_POINTERS) {
    return null;
  }

  const [first, second] = Array.from(state.pointers.values());

  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

/** 포인터가 닿았다. 추적 상한을 넘으면 받지 않는다. */
export const pressPointer = (
  state: PointerGestureState,
  pointerId: number,
  clientX: number,
  clientY: number,
): boolean => {
  if (state.pointers.size >= MAX_TRACKED_POINTERS) {
    return false;
  }

  state.pointers.set(pointerId, { clientX, clientY });

  return true;
};

/**
 * 포인터가 움직였다. 시야 회전에 쓸 이동량을 돌려준다.
 *
 * 손가락이 둘일 때는 회전이 일어나지 않는다. 그때의 이동은 줌 제스처의 일부라
 * 시야까지 같이 돌면 조작이 뒤섞인다.
 */
export const movePointer = (
  state: PointerGestureState,
  pointerId: number,
  clientX: number,
  clientY: number,
): PointerDragDelta => {
  const trackedPointer = state.pointers.get(pointerId);

  if (!trackedPointer) {
    return NO_DRAG;
  }

  const dragX = clientX - trackedPointer.clientX;
  const dragY = clientY - trackedPointer.clientY;

  trackedPointer.clientX = clientX;
  trackedPointer.clientY = clientY;

  return state.pointers.size === MAX_TRACKED_POINTERS ? NO_DRAG : { dragX, dragY };
};

/** 포인터가 떨어졌다. 추적 중이던 포인터였으면 `true`. */
export const releasePointer = (state: PointerGestureState, pointerId: number): boolean => {
  return state.pointers.delete(pointerId);
};

/** 화면에 손가락이 닿아 있는지. 터치 중 합성되는 휠 이벤트를 거르는 데 쓴다. */
export const hasActivePointers = (state: PointerGestureState): boolean => {
  return state.pointers.size > 0;
};
