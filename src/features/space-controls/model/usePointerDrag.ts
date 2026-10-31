"use client";

import { useEffect } from "react";
import { SPACE_CAMERA } from "./followCamera";
import {
  createPointerGestureState,
  hasActivePointers,
  movePointer,
  pressPointer,
  readPinchSpread,
  releasePointer,
} from "./pointerGesture";
import type { SpaceInputSource } from "./spaceInputSource";

/**
 * 포인터 입력을 시야 회전과 줌으로 옮긴다.
 *
 * 제스처 해석 자체는 `pointerGesture` 에 있다. 여기서는 DOM 이벤트를 붙이고
 * 결과를 입력 수집 지점에 쌓는 일만 한다.
 *
 * - 손가락 하나: 좌우는 yaw, 상하는 피치
 * - 손가락 둘: 사이 거리 변화만 줌. 프레임 단위로 비교한다
 * - 휠: 데스크톱 줌
 */
const usePointerDrag = (inputSource: SpaceInputSource, targetElement: HTMLElement | null): void => {
  // region [Life Cycles]
  useEffect(() => {
    if (!targetElement) {
      return;
    }

    const gestureState = createPointerGestureState();

    const syncPinchSpread = (): void => {
      inputSource.pinchSpread = readPinchSpread(gestureState);
    };

    const onPointerDown = (pointerEvent: PointerEvent): void => {
      if (
        !pressPointer(
          gestureState,
          pointerEvent.pointerId,
          pointerEvent.clientX,
          pointerEvent.clientY,
        )
      ) {
        return;
      }

      targetElement.setPointerCapture(pointerEvent.pointerId);
      syncPinchSpread();
    };

    const onPointerMove = (pointerEvent: PointerEvent): void => {
      const { dragX, dragY } = movePointer(
        gestureState,
        pointerEvent.pointerId,
        pointerEvent.clientX,
        pointerEvent.clientY,
      );

      inputSource.pendingDragX += dragX;
      inputSource.pendingDragY += dragY;
      syncPinchSpread();
    };

    const onPointerRelease = (pointerEvent: PointerEvent): void => {
      if (!releasePointer(gestureState, pointerEvent.pointerId)) {
        return;
      }

      syncPinchSpread();

      if (targetElement.hasPointerCapture(pointerEvent.pointerId)) {
        targetElement.releasePointerCapture(pointerEvent.pointerId);
      }
    };

    const onWheel = (wheelEvent: WheelEvent): void => {
      // 기본 스크롤을 막지 않으면 캔버스 위 휠이 페이지를 움직인다.
      wheelEvent.preventDefault();

      // 손가락이 닿아 있는 동안의 휠은 두 손가락 팬에서 합성된 것이다.
      // 핀치와 겹쳐 두 배로 줌이 걸리므로 흘려보낸다.
      if (hasActivePointers(gestureState)) {
        return;
      }

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
      inputSource.pinchSpread = null;
      inputSource.consumedPinchSpread = null;
    };
  }, [inputSource, targetElement]);
  // endregion
};

export default usePointerDrag;
