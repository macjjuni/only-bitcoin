"use client";

import { ChevronsUp } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { SpaceInputSource } from "../model/spaceInputSource";
import {
  JUMP_BUTTON_POSITION,
  TOUCH_BUTTON_DIAMETER,
  TOUCH_BUTTON_ICON_SIZE,
  TOUCH_BUTTON_IDLE_CLASS,
  TOUCH_BUTTON_PRESSED_CLASS,
  TOUCH_BUTTON_SURFACE_CLASS,
} from "./touchButtonLayout";

const ICON_STROKE_WIDTH = 2.5;

interface JumpButtonProps {
  inputSource: SpaceInputSource;
}

/**
 * 손가락 기기 전용 점프 버튼.
 *
 * 조이스틱은 2축이라 점프를 실을 자리가 없음. 조이스틱과 같은 `joystick` 채널에
 * 쓰지만 건드리는 필드가 `isJumping` 하나뿐이라 두 입력이 서로 값을 덮지 않음.
 *
 * 누르고 있으면 착지할 때마다 다시 뜀. 데스크톱 `Space` 와 같은 동작이며,
 * 점프 상태는 프레임 루프가 매 프레임 읽으므로 React 상태로 들고 있지 않음.
 * 눌린 모양만 상태로 둠.
 */
function JumpButton({ inputSource }: JumpButtonProps): ReactNode {
  // region [Hooks]
  const activePointerIdRef = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState<boolean>(false);
  // endregion

  // region [Privates]
  /** 손가락을 떼거나 입력이 끊겼을 때 점프를 멈춤. */
  const releaseJumpInput = useCallback((): void => {
    activePointerIdRef.current = null;
    inputSource.joystick.isJumping = false;
    setIsPressed(false);
  }, [inputSource]);
  // endregion

  // region [Events]
  const onPointerDownJump = useCallback(
    (pointerEvent: React.PointerEvent<HTMLButtonElement>): void => {
      if (activePointerIdRef.current !== null) {
        return;
      }

      activePointerIdRef.current = pointerEvent.pointerId;
      // 손가락이 버튼 밖으로 미끄러져도 떼는 순간을 받음.
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
      inputSource.joystick.isJumping = true;
      setIsPressed(true);
    },
    [inputSource],
  );

  const onPointerUpJump = useCallback(
    (pointerEvent: React.PointerEvent<HTMLButtonElement>): void => {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      releaseJumpInput();
    },
    [releaseJumpInput],
  );
  // endregion

  // region [Privates]
  /** 창을 벗어나거나 탭이 숨으면 눌린 점프가 남지 않게 비움. */
  const attachJumpResetEvents = useCallback((): (() => void) => {
    window.addEventListener("blur", releaseJumpInput);
    document.addEventListener("visibilitychange", releaseJumpInput);

    return () => {
      window.removeEventListener("blur", releaseJumpInput);
      document.removeEventListener("visibilitychange", releaseJumpInput);
      activePointerIdRef.current = null;
      inputSource.joystick.isJumping = false;
    };
  }, [inputSource, releaseJumpInput]);
  // endregion

  // region [Life Cycles]
  useEffect(attachJumpResetEvents, [attachJumpResetEvents]);
  // endregion

  return (
    <button
      type="button"
      aria-label="점프"
      className={`${TOUCH_BUTTON_SURFACE_CLASS} ${
        isPressed ? TOUCH_BUTTON_PRESSED_CLASS : TOUCH_BUTTON_IDLE_CLASS
      }`}
      style={{
        width: TOUCH_BUTTON_DIAMETER,
        height: TOUCH_BUTTON_DIAMETER,
        ...JUMP_BUTTON_POSITION,
      }}
      onPointerDown={onPointerDownJump}
      onPointerUp={onPointerUpJump}
      onPointerCancel={onPointerUpJump}
      onLostPointerCapture={onPointerUpJump}
    >
      <ChevronsUp
        size={TOUCH_BUTTON_ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
        aria-hidden="true"
      />
    </button>
  );
}

const MemoizedJumpButton = memo(JumpButton);
MemoizedJumpButton.displayName = "JumpButton";

export default MemoizedJumpButton;
