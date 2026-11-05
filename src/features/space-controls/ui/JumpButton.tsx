"use client";

import { ChevronUp } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { SpaceInputSource } from "../model/spaceInputSource";

/** 72 px 에서 20% 줄였음. 엄지 자리를 덜 차지하고 화면을 덜 가림. */
const BUTTON_DIAMETER = 58;
const ICON_SIZE = 22;
/** 줄어든 지름의 절반. 위치를 이만큼 안쪽으로 밀어 버튼 중심을 원래 자리에 둠. */
const CENTER_KEEP_OFFSET = (72 - BUTTON_DIAMETER) / 2;
const ICON_STROKE_WIDTH = 2.5;

interface JumpButtonProps {
  inputSource: SpaceInputSource;
}

/**
 * 손가락 기기 전용 점프 버튼.
 *
 * 조이스틱은 2축이라 점프를 실을 자리가 없다. 조이스틱과 같은 `joystick` 채널에
 * 쓰지만 건드리는 필드가 `isJumping` 하나뿐이라 두 입력이 서로 값을 덮지 않는다.
 *
 * 누르고 있으면 착지할 때마다 다시 뛴다. 데스크톱 `Space` 와 같은 동작이며,
 * 점프 상태는 프레임 루프가 매 프레임 읽으므로 React 상태로 들고 있지 않는다.
 * 눌린 모양만 상태로 둔다.
 */
function JumpButton({ inputSource }: JumpButtonProps): ReactNode {
  // region [Hooks]
  const activePointerIdRef = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState<boolean>(false);
  // endregion

  // region [Privates]
  /** 손가락을 떼거나 입력이 끊겼을 때 점프를 멈춘다. */
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
      // 손가락이 버튼 밖으로 미끄러져도 떼는 순간을 받는다.
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
  /** 창을 벗어나거나 탭이 숨으면 눌린 점프가 남지 않게 비운다. */
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
      className={`absolute flex items-center justify-center rounded-full border backdrop-blur-sm touch-none select-none ${
        isPressed ? "border-bitcoin/70 bg-bitcoin/35" : "border-white/20 bg-white/10"
      }`}
      style={{
        width: BUTTON_DIAMETER,
        height: BUTTON_DIAMETER,
        right: `calc(1.5rem + ${CENTER_KEEP_OFFSET}px + env(safe-area-inset-right))`,
        bottom: `calc(4.5rem + ${CENTER_KEEP_OFFSET}px + env(safe-area-inset-bottom))`,
      }}
      onPointerDown={onPointerDownJump}
      onPointerUp={onPointerUpJump}
      onPointerCancel={onPointerUpJump}
      onLostPointerCapture={onPointerUpJump}
    >
      <ChevronUp
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE_WIDTH}
        className="text-white/85"
        aria-hidden="true"
      />
    </button>
  );
}

const MemoizedJumpButton = memo(JumpButton);
MemoizedJumpButton.displayName = "JumpButton";

export default MemoizedJumpButton;
