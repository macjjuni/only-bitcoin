"use client";

import { memo, type ReactNode, useCallback, useRef, useState } from "react";
import type { SpaceInputSource } from "../model/spaceInputSource";

const JOYSTICK_BASE_RADIUS = 60;
const JOYSTICK_KNOB_RADIUS = 26;
/** 이 비율 이상 밀면 달리기로 본다. 모바일에 Shift 가 없다. */
const RUN_THRESHOLD_RATIO = 0.85;

interface VirtualJoystickProps {
  inputSource: SpaceInputSource;
}

interface TouchPoint {
  x: number;
  y: number;
}

const ZERO_POINT: TouchPoint = { x: 0, y: 0 };

/**
 * 화면 왼쪽 절반에 뜨는 가변 조이스틱.
 *
 * 고정 위치 조이스틱은 엄지를 그 자리까지 옮겨야 해서 화면을 보면서 조작하기
 * 어렵다. 누른 자리에 생겼다가 떼면 사라지는 방식이 모바일 게임의 표준이다.
 *
 * 영역을 왼쪽 절반으로 제한한 이유는 오른쪽 절반이 캔버스의 시야 회전·줌
 * 영역이기 때문이다. 화면 전체를 덮으면 두 조작이 서로를 먹는다.
 */
function VirtualJoystick({ inputSource }: VirtualJoystickProps): ReactNode {
  // region [Hooks]
  const activePointerIdRef = useRef<number | null>(null);
  const originRef = useRef<TouchPoint>(ZERO_POINT);
  const [origin, setOrigin] = useState<TouchPoint | null>(null);
  const [knobOffset, setKnobOffset] = useState<TouchPoint>(ZERO_POINT);
  // endregion

  // region [Privates]
  /** 처음 누른 지점 기준 오프셋을 기준원 안으로 깎는다. */
  const resolveKnobOffset = useCallback((clientX: number, clientY: number): TouchPoint => {
    const rawX = clientX - originRef.current.x;
    const rawY = clientY - originRef.current.y;
    const rawDistance = Math.hypot(rawX, rawY);

    if (rawDistance <= JOYSTICK_BASE_RADIUS || rawDistance === 0) {
      return { x: rawX, y: rawY };
    }

    const clampRatio = JOYSTICK_BASE_RADIUS / rawDistance;

    return { x: rawX * clampRatio, y: rawY * clampRatio };
  }, []);

  const applyJoystickInput = useCallback(
    (offset: TouchPoint): void => {
      // 화면 위로 밀면 전진이므로 y 를 뒤집는다.
      inputSource.joystick.forward = -offset.y / JOYSTICK_BASE_RADIUS;
      inputSource.joystick.strafe = offset.x / JOYSTICK_BASE_RADIUS;
      inputSource.joystick.isRunning =
        Math.hypot(offset.x, offset.y) / JOYSTICK_BASE_RADIUS >= RUN_THRESHOLD_RATIO;
    },
    [inputSource],
  );

  const resetJoystick = useCallback((): void => {
    inputSource.joystick.forward = 0;
    inputSource.joystick.strafe = 0;
    inputSource.joystick.isRunning = false;
    setKnobOffset(ZERO_POINT);
    setOrigin(null);
  }, [inputSource]);
  // endregion

  // region [Events]
  const onPointerDownTouchZone = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      if (activePointerIdRef.current !== null) {
        return;
      }

      activePointerIdRef.current = pointerEvent.pointerId;
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

      originRef.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
      setOrigin(originRef.current);
      setKnobOffset(ZERO_POINT);
      applyJoystickInput(ZERO_POINT);
    },
    [applyJoystickInput],
  );

  const onPointerMoveTouchZone = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      const offset = resolveKnobOffset(pointerEvent.clientX, pointerEvent.clientY);
      setKnobOffset(offset);
      applyJoystickInput(offset);
    },
    [applyJoystickInput, resolveKnobOffset],
  );

  const onPointerUpTouchZone = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      activePointerIdRef.current = null;
      resetJoystick();
    },
    [resetJoystick],
  );
  // endregion

  // region [Templates]
  const JoystickTemplate =
    origin === null ? null : (
      <>
        <div
          className="pointer-events-none fixed rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
          style={{
            width: JOYSTICK_BASE_RADIUS * 2,
            height: JOYSTICK_BASE_RADIUS * 2,
            left: origin.x - JOYSTICK_BASE_RADIUS,
            top: origin.y - JOYSTICK_BASE_RADIUS,
          }}
        />
        <div
          className="pointer-events-none fixed rounded-full bg-bitcoin/75 shadow-lg"
          style={{
            width: JOYSTICK_KNOB_RADIUS * 2,
            height: JOYSTICK_KNOB_RADIUS * 2,
            left: origin.x - JOYSTICK_KNOB_RADIUS,
            top: origin.y - JOYSTICK_KNOB_RADIUS,
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
          }}
        />
      </>
    );
  // endregion

  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1/2 touch-none select-none"
        onPointerDown={onPointerDownTouchZone}
        onPointerMove={onPointerMoveTouchZone}
        onPointerUp={onPointerUpTouchZone}
        onPointerCancel={onPointerUpTouchZone}
      />

      {JoystickTemplate}
    </>
  );
}

const MemoizedVirtualJoystick = memo(VirtualJoystick);
MemoizedVirtualJoystick.displayName = "VirtualJoystick";

export default MemoizedVirtualJoystick;
