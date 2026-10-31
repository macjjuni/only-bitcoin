"use client";

import { useEffect } from "react";
import type { SpaceInputSource } from "./spaceInputSource";

/**
 * 포인터 드래그를 시야 회전 입력으로 누적한다.
 *
 * 조이스틱은 캔버스 위에 떠 있는 별도 DOM 이라 조이스틱을 잡은 포인터는 여기로
 * 오지 않는다. 즉 모바일에서 왼손 조이스틱 이동과 오른손 드래그 회전이 겹치지 않는다.
 */
const usePointerDrag = (inputSource: SpaceInputSource, targetElement: HTMLElement | null): void => {
  // region [Life Cycles]
  useEffect(() => {
    if (!targetElement) {
      return;
    }

    let activePointerId: number | null = null;
    let lastClientX = 0;
    let lastClientY = 0;

    const onPointerDown = (pointerEvent: PointerEvent): void => {
      if (activePointerId !== null) {
        return;
      }

      activePointerId = pointerEvent.pointerId;
      lastClientX = pointerEvent.clientX;
      lastClientY = pointerEvent.clientY;
      targetElement.setPointerCapture(pointerEvent.pointerId);
    };

    const onPointerMove = (pointerEvent: PointerEvent): void => {
      if (pointerEvent.pointerId !== activePointerId) {
        return;
      }

      inputSource.pendingDragX += pointerEvent.clientX - lastClientX;
      inputSource.pendingDragY += pointerEvent.clientY - lastClientY;
      lastClientX = pointerEvent.clientX;
      lastClientY = pointerEvent.clientY;
    };

    const onPointerRelease = (pointerEvent: PointerEvent): void => {
      if (pointerEvent.pointerId !== activePointerId) {
        return;
      }

      activePointerId = null;

      if (targetElement.hasPointerCapture(pointerEvent.pointerId)) {
        targetElement.releasePointerCapture(pointerEvent.pointerId);
      }
    };

    targetElement.addEventListener("pointerdown", onPointerDown);
    targetElement.addEventListener("pointermove", onPointerMove);
    targetElement.addEventListener("pointerup", onPointerRelease);
    targetElement.addEventListener("pointercancel", onPointerRelease);

    return () => {
      targetElement.removeEventListener("pointerdown", onPointerDown);
      targetElement.removeEventListener("pointermove", onPointerMove);
      targetElement.removeEventListener("pointerup", onPointerRelease);
      targetElement.removeEventListener("pointercancel", onPointerRelease);
    };
  }, [inputSource, targetElement]);
  // endregion
};

export default usePointerDrag;
