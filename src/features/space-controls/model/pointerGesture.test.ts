import { describe, expect, it } from "vitest";
import {
  consumePendingZoom,
  createSpaceInputSource,
  SPACE_CAMERA,
} from "@/features/space-controls";
import {
  createPointerGestureState,
  hasActivePointers,
  movePointer,
  type PointerGestureState,
  pressPointer,
  readPinchSpread,
  releasePointer,
} from "@/features/space-controls/model/pointerGesture";

/** 손가락 둘을 수평으로 벌려 놓은 상태를 만든다. */
const createTwoFingerState = (spread: number): PointerGestureState => {
  const state = createPointerGestureState();

  pressPointer(state, 1, 200 - spread / 2, 400);
  pressPointer(state, 2, 200 + spread / 2, 400);

  return state;
};

/**
 * 실제 사용 흐름을 흉내 낸다.
 *
 * 포인터 이벤트로 제스처 상태를 갱신하고, 프레임마다 입력 수집 지점에 현재
 * 손가락 사이 거리를 올린 뒤 줌을 소비한다.
 */
const createGestureRunner = () => {
  const state = createPointerGestureState();
  const inputSource = createSpaceInputSource();

  return {
    state,
    press: (id: number, x: number, y: number) => pressPointer(state, id, x, y),
    move: (id: number, x: number, y: number) => movePointer(state, id, x, y),
    release: (id: number) => releasePointer(state, id),
    /** 한 프레임 넘기고 그동안의 줌량을 받는다. */
    tick: (): number => {
      inputSource.pinchSpread = readPinchSpread(state);
      return consumePendingZoom(inputSource);
    },
  };
};

describe("손가락 하나 — 시야 회전", () => {
  it("좌우 드래그가 yaw 로 간다", () => {
    const state = createPointerGestureState();
    pressPointer(state, 1, 100, 300);

    expect(movePointer(state, 1, 160, 300)).toEqual({ dragX: 60, dragY: 0 });
  });

  it("상하 드래그가 피치로 간다", () => {
    const state = createPointerGestureState();
    pressPointer(state, 1, 100, 300);

    expect(movePointer(state, 1, 100, 240)).toEqual({ dragX: 0, dragY: -60 });
  });

  it("손가락 하나로는 줌이 걸리지 않는다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 300);
    runner.tick();

    runner.move(1, 100, 120);

    expect(runner.tick()).toBe(0);
  });

  it("추적하지 않는 포인터는 무시한다", () => {
    const state = createPointerGestureState();

    expect(movePointer(state, 99, 10, 10)).toEqual({ dragX: 0, dragY: 0 });
  });
});

describe("손가락 둘 — 줌", () => {
  it("벌리면 가까워진다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    runner.move(2, 360, 400);

    expect(runner.tick()).toBeLessThan(0);
  });

  it("모으면 멀어진다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    runner.move(2, 240, 400);

    expect(runner.tick()).toBeGreaterThan(0);
  });

  it("거리 변화량에 감도를 곱한 값이다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    const spreadChange = 60;
    runner.move(2, 300 + spreadChange, 400);

    expect(runner.tick()).toBeCloseTo(-spreadChange * SPACE_CAMERA.pinchZoomSensitivity, 9);
  });

  it("두 손가락을 나란히 위아래로 끌어도 줌이 걸리지 않는다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    // 포인터 이벤트는 손가락마다 따로 오지만, 프레임 시점에는 둘 다 반영돼 있다.
    runner.move(1, 100, 250);
    runner.move(2, 300, 250);

    expect(runner.tick()).toBeCloseTo(0, 9);
  });

  it("두 손가락을 나란히 좌우로 끌어도 줌이 걸리지 않는다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    runner.move(1, 180, 400);
    runner.move(2, 380, 400);

    expect(runner.tick()).toBeCloseTo(0, 9);
  });

  it("여러 프레임에 걸친 나란한 이동에도 줌이 쌓이지 않는다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    let totalZoom = 0;

    for (let frame = 1; frame <= 10; frame += 1) {
      runner.move(1, 100, 400 - frame * 12);
      runner.move(2, 300, 400 - frame * 12);
      totalZoom += runner.tick();
    }

    expect(totalZoom).toBeCloseTo(0, 9);
  });

  it("두 손가락 중에는 시야 회전이 일어나지 않는다", () => {
    const state = createTwoFingerState(200);

    expect(movePointer(state, 2, 340, 450)).toEqual({ dragX: 0, dragY: 0 });
  });
});

describe("포인터 추적", () => {
  it("셋째 손가락은 받지 않는다", () => {
    const state = createTwoFingerState(200);

    expect(pressPointer(state, 3, 50, 50)).toBe(false);
    expect(state.pointers.size).toBe(2);
  });

  it("손가락이 둘이 아니면 사이 거리가 없다", () => {
    const state = createPointerGestureState();

    expect(readPinchSpread(state)).toBeNull();

    pressPointer(state, 1, 100, 400);
    expect(readPinchSpread(state)).toBeNull();

    pressPointer(state, 2, 300, 400);
    expect(readPinchSpread(state)).toBeCloseTo(200, 9);
  });

  it("하나를 떼면 남은 손가락으로 다시 시야 회전이 된다", () => {
    const state = createTwoFingerState(200);
    releasePointer(state, 2);

    expect(movePointer(state, 1, 160, 400).dragX).toBe(60);
  });

  it("하나를 뗀 직후 줌이 튀지 않는다", () => {
    const runner = createGestureRunner();
    runner.press(1, 100, 400);
    runner.press(2, 300, 400);
    runner.tick();

    runner.release(2);

    expect(runner.tick()).toBe(0);
  });

  it("추적하지 않던 포인터를 떼도 상태가 망가지지 않는다", () => {
    const state = createPointerGestureState();

    expect(releasePointer(state, 42)).toBe(false);
  });

  it("손가락이 닿아 있는지 알려준다", () => {
    const state = createPointerGestureState();

    expect(hasActivePointers(state)).toBe(false);

    pressPointer(state, 1, 0, 0);
    expect(hasActivePointers(state)).toBe(true);

    releasePointer(state, 1);
    expect(hasActivePointers(state)).toBe(false);
  });
});
