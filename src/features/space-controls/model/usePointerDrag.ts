"use client";

import { useEffect } from "react";
import { attachPointerGestureEvents } from "./pointerGestureEvents";
import type { SpaceInputSource } from "./spaceInputSource";

/**
 * 포인터 입력을 시야 회전과 줌으로 옮긴다.
 *
 * 이벤트 연결은 `attachPointerGestureEvents` 에 있음. 캡처 유실·창 blur·
 * 끊긴 핀치 정리까지 테스트로 고정돼 있어 그쪽을 씀.
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

    return attachPointerGestureEvents(inputSource, targetElement, window);
  }, [inputSource, targetElement]);
  // endregion
};

export default usePointerDrag;
