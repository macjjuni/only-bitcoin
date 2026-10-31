"use client";

import { useEffect } from "react";
import { SPACE_CAMERA } from "./followCamera";
import type { SpaceInputSource } from "./spaceInputSource";

/**
 * 포인터 입력을 시야 회전과 줌으로 누적한다.
 *
 * 한 손가락(또는 마우스 드래그)은 회전, 두 손가락 핀치와 휠은 줌이다.
 * 조이스틱은 캔버스 위에 떠 있는 별도 DOM 이라 조이스틱을 잡은 포인터는 여기로
 * 오지 않는다. 즉 모바일에서 왼손 조이스틱 이동과 오른손 드래그 회전이 겹치지 않는다.
 */
const usePointerDrag = (inputSource: SpaceInputSource, targetElement: HTMLElement | null): void => {
  // region [Life Cycles]
  useEffect(() => {
    if (!targetElement) {
      return;
    }

    /** 화면에 닿아 있는 포인터. 2개가 되면 핀치로 본다. */
    const activePointers = new Map<number, { clientX: number; clientY: number }>();
    let lastPinchSpread: number | null = null;

    const resolvePinchSpread = (): number | null => {
      if (activePointers.size !== 2) {
        return null;
      }

      const [first, second] = Array.from(activePointers.values());

      return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    };

    const onPointerDown = (pointerEvent: PointerEvent): void => {
      if (activePointers.size >= 2) {
        return;
      }

      activePointers.set(pointerEvent.pointerId, {
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
      });
      targetElement.setPointerCapture(pointerEvent.pointerId);
      lastPinchSpread = resolvePinchSpread();
    };

    const onPointerMove = (pointerEvent: PointerEvent): void => {
      const trackedPointer = activePointers.get(pointerEvent.pointerId);

      if (!trackedPointer) {
        return;
      }

      const deltaX = pointerEvent.clientX - trackedPointer.clientX;
      const deltaY = pointerEvent.clientY - trackedPointer.clientY;

      trackedPointer.clientX = pointerEvent.clientX;
      trackedPointer.clientY = pointerEvent.clientY;

      if (activePointers.size === 2) {
        const pinchSpread = resolvePinchSpread();

        // 손가락을 벌리면 가까워지고 모으면 멀어진다. 지도 확대와 같은 방향이다.
        if (pinchSpread !== null && lastPinchSpread !== null) {
          inputSource.pendingZoomDistance -=
            (pinchSpread - lastPinchSpread) * SPACE_CAMERA.pinchZoomSensitivity;
        }

        lastPinchSpread = pinchSpread;

        return;
      }

      inputSource.pendingDragX += deltaX;
      inputSource.pendingDragY += deltaY;
    };

    const onPointerRelease = (pointerEvent: PointerEvent): void => {
      if (!activePointers.delete(pointerEvent.pointerId)) {
        return;
      }

      lastPinchSpread = resolvePinchSpread();

      if (targetElement.hasPointerCapture(pointerEvent.pointerId)) {
        targetElement.releasePointerCapture(pointerEvent.pointerId);
      }
    };

    const onWheel = (wheelEvent: WheelEvent): void => {
      // 기본 스크롤을 막지 않으면 캔버스 위 휠이 페이지를 움직인다.
      wheelEvent.preventDefault();
      inputSource.pendingZoomDistance += wheelEvent.deltaY * SPACE_CAMERA.wheelZoomSensitivity;
    };

    targetElement.addEventListener("pointerdown", onPointerDown);
    targetElement.addEventListener("pointermove", onPointerMove);
    targetElement.addEventListener("pointerup", onPointerRelease);
    targetElement.addEventListener("pointercancel", onPointerRelease);
    targetElement.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      targetElement.removeEventListener("pointerdown", onPointerDown);
      targetElement.removeEventListener("pointermove", onPointerMove);
      targetElement.removeEventListener("pointerup", onPointerRelease);
      targetElement.removeEventListener("pointercancel", onPointerRelease);
      targetElement.removeEventListener("wheel", onWheel);
    };
  }, [inputSource, targetElement]);
  // endregion
};

export default usePointerDrag;
