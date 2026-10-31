"use client";

import { useEffect } from "react";
import { attachPointerGestureEvents } from "./pointerGestureEvents";
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

    return attachPointerGestureEvents(inputSource, targetElement, window);
  }, [inputSource, targetElement]);
  // endregion
};

export default usePointerDrag;
