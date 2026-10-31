import { afterEach, describe, expect, it } from "vitest";
import { SPACE_CAMERA } from "./followCamera";
import { attachPointerGestureEvents } from "./pointerGestureEvents";
import { consumePendingDrag, consumePendingZoom, createSpaceInputSource } from "./spaceInputSource";

class CanvasEventTarget extends EventTarget {
  private capturedPointerIds = new Set<number>();

  setPointerCapture(pointerId: number): void {
    this.capturedPointerIds.add(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.capturedPointerIds.has(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    if (this.capturedPointerIds.delete(pointerId)) {
      this.emitPointer("lostpointercapture", pointerId);
    }
  }

  emitPointer(
    eventType: string,
    pointerId: number,
    clientX = 0,
    clientY = 0,
    pointerType = "touch",
  ): void {
    const pointerEvent = new Event(eventType);
    Object.assign(pointerEvent, { pointerId, clientX, clientY, pointerType });
    this.dispatchEvent(pointerEvent);
  }

  emitWheel(deltaY: number): Event {
    const wheelEvent = new Event("wheel", { cancelable: true });
    Object.assign(wheelEvent, { deltaY });
    this.dispatchEvent(wheelEvent);

    return wheelEvent;
  }
}

const cleanupCallbacks: Array<() => void> = [];

const createCanvasControls = () => {
  const canvas = new CanvasEventTarget();
  const windowEvents = new EventTarget();
  const inputSource = createSpaceInputSource();
  const detach = attachPointerGestureEvents(
    inputSource,
    canvas as unknown as HTMLElement,
    windowEvents,
  );
  cleanupCallbacks.push(detach);

  return { canvas, windowEvents, inputSource, detach };
};

afterEach(() => {
  for (const cleanup of cleanupCallbacks.splice(0)) {
    cleanup();
  }
});

describe("캔버스 포인터 이벤트 → 프레임 입력", () => {
  it("한 손가락 드래그를 시야 회전에 전달하고 한 번만 소비한다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 300);
    canvas.emitPointer("pointermove", 1, 160, 240);

    expect(canvas.hasPointerCapture(1)).toBe(true);
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 60, deltaY: -60 });
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });
    expect(consumePendingZoom(inputSource)).toBe(0);
  });

  it("핀치가 시작되면 미소비 회전을 지우고 실제 거리 변화만 줌으로 전달한다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointermove", 1, 110, 400);
    canvas.emitPointer("pointerdown", 2, 310, 400);
    canvas.emitPointer("pointermove", 2, 370, 400);

    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });
    expect(consumePendingZoom(inputSource)).toBeCloseTo(-60 * SPACE_CAMERA.pinchZoomSensitivity);
    expect(consumePendingZoom(inputSource)).toBe(0);

    canvas.emitPointer("pointermove", 2, 340, 400);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(30 * SPACE_CAMERA.pinchZoomSensitivity);
  });

  it("두 손가락을 나란히 이동할 때 회전과 합성 휠 줌이 섞이지 않는다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 1, 180, 250);
    canvas.emitPointer("pointermove", 2, 380, 250);
    const syntheticWheel = canvas.emitWheel(100);

    expect(syntheticWheel.defaultPrevented).toBe(true);
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });
    expect(consumePendingZoom(inputSource)).toBeCloseTo(0);
  });

  it("손가락 하나를 떼면 남은 손가락의 최신 위치부터 다시 회전한다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 1, 120, 420);
    canvas.emitPointer("pointerup", 2);
    canvas.emitPointer("pointermove", 1, 125, 410);

    expect(canvas.hasPointerCapture(2)).toBe(false);
    const finalSpreadChange = Math.hypot(180, 20) - 200;
    expect(consumePendingZoom(inputSource)).toBeCloseTo(
      -finalSpreadChange * SPACE_CAMERA.pinchZoomSensitivity,
    );
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 5, deltaY: -10 });
  });

  it("다음 프레임 전에 정상 종료된 핀치의 마지막 이동량을 한 번만 전달한다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 2, 360, 400);
    canvas.emitPointer("pointerup", 2);
    canvas.emitPointer("pointerup", 1);
    // 브라우저가 뒤늦게 보내는 캡처 해제 이벤트도 정상 종료된 입력을 지우지 않는다.
    canvas.emitPointer("lostpointercapture", 2);
    canvas.emitPointer("lostpointercapture", 1);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(-60 * SPACE_CAMERA.pinchZoomSensitivity);
    expect(consumePendingZoom(inputSource)).toBe(0);
  });

  it("같은 프레임에 새 핀치가 시작되어도 이전 핀치의 미소비 줌을 합산한다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 2, 360, 400);
    canvas.emitPointer("pointerup", 2);
    canvas.emitPointer("pointerdown", 3, 600, 400);
    canvas.emitPointer("pointermove", 3, 620, 400);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(-80 * SPACE_CAMERA.pinchZoomSensitivity);
    expect(consumePendingZoom(inputSource)).toBe(0);
  });

  it("프레임 사이에 손가락을 떼고 다시 핀치해도 이전 거리로 줌이 튀지 않는다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 2, 360, 400);
    consumePendingZoom(inputSource);

    canvas.emitPointer("pointerup", 2);
    canvas.emitPointer("pointerdown", 3, 600, 400);

    expect(consumePendingZoom(inputSource)).toBe(0);

    canvas.emitPointer("pointermove", 3, 620, 400);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(-20 * SPACE_CAMERA.pinchZoomSensitivity);
  });

  it("셋째 포인터와 그 해제는 기존 핀치 기준점을 바꾸지 않는다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointerdown", 3, 800, 400);
    canvas.emitPointer("pointermove", 2, 320, 400);
    canvas.emitPointer("pointerup", 3);

    expect(canvas.hasPointerCapture(3)).toBe(false);
    expect(consumePendingZoom(inputSource)).toBeCloseTo(-20 * SPACE_CAMERA.pinchZoomSensitivity);
  });

  it.each([
    "pointercancel",
    "lostpointercapture",
  ])("%s 후에는 미소비 입력과 포인터 추적을 정리한다", (eventType) => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointermove", 1, 140, 350);

    if (eventType === "lostpointercapture") {
      canvas.releasePointerCapture(1);
    } else {
      canvas.emitPointer(eventType, 1);
    }

    canvas.emitPointer("pointermove", 1, 200, 300);

    expect(canvas.hasPointerCapture(1)).toBe(false);
    expect(inputSource.pinchSpread).toBeNull();
    expect(inputSource.consumedPinchSpread).toBeNull();
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });

    canvas.emitWheel(100);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(100 * SPACE_CAMERA.wheelZoomSensitivity);
  });

  it("창이 포커스를 잃으면 캡처와 핀치를 지우고 새 제스처를 받는다", () => {
    const { canvas, windowEvents, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 2, 360, 400);
    windowEvents.dispatchEvent(new Event("blur"));

    expect(canvas.hasPointerCapture(1)).toBe(false);
    expect(canvas.hasPointerCapture(2)).toBe(false);
    expect(consumePendingZoom(inputSource)).toBe(0);

    canvas.emitPointer("pointerdown", 3, 20, 50);
    canvas.emitPointer("pointermove", 3, 30, 70);

    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 10, deltaY: 20 });
  });

  it.each([
    "pointercancel",
    "blur",
    "cleanup",
  ])("%s은 정상 종료된 핀치의 미소비 줌까지 폐기한다", (resetType) => {
    const { canvas, windowEvents, inputSource, detach } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointerdown", 2, 300, 400);
    canvas.emitPointer("pointermove", 2, 360, 400);
    canvas.emitPointer("pointerup", 2);

    if (resetType === "cleanup") {
      detach();
    } else if (resetType === "blur") {
      windowEvents.dispatchEvent(new Event("blur"));
    } else {
      canvas.emitPointer(resetType, 1);
    }

    expect(consumePendingZoom(inputSource)).toBe(0);
  });

  it("연결 해제는 캡처와 대기 입력을 지우고 모든 리스너를 제거한다", () => {
    const { canvas, windowEvents, inputSource, detach } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400);
    canvas.emitPointer("pointermove", 1, 150, 400);
    detach();

    expect(canvas.hasPointerCapture(1)).toBe(false);
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });

    canvas.emitPointer("pointerdown", 2, 200, 400);
    canvas.emitPointer("pointermove", 2, 240, 400);
    canvas.emitWheel(100);

    expect(canvas.hasPointerCapture(2)).toBe(false);
    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });
    expect(consumePendingZoom(inputSource)).toBe(0);

    inputSource.pendingDragX = 12;
    windowEvents.dispatchEvent(new Event("blur"));

    expect(consumePendingDrag(inputSource).deltaX).toBe(12);
  });

  it("마우스 드래그 중에는 일반 휠 줌을 유지하고 터치를 떼면 휠을 다시 받는다", () => {
    const { canvas, inputSource } = createCanvasControls();
    canvas.emitPointer("pointerdown", 1, 100, 400, "mouse");
    canvas.emitWheel(100);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(100 * SPACE_CAMERA.wheelZoomSensitivity);

    canvas.emitPointer("pointerup", 1);
    canvas.emitPointer("pointerdown", 2, 100, 400);
    canvas.emitWheel(100);

    expect(consumePendingZoom(inputSource)).toBe(0);

    canvas.emitPointer("pointerup", 2);
    canvas.emitWheel(-100);

    expect(consumePendingZoom(inputSource)).toBeCloseTo(-100 * SPACE_CAMERA.wheelZoomSensitivity);
  });
});
