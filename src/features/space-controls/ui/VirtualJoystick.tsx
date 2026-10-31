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

interface KnobOffset {
  x: number;
  y: number;
}

const ZERO_OFFSET: KnobOffset = { x: 0, y: 0 };

/**
 * 하단 중앙 고정 조이스틱.
 *
 * 넓은 터치 영역을 두면 그 영역이 캔버스를 덮어 시야 회전 드래그와 두 손가락
 * 줌이 캔버스까지 닿지 못한다. 조이스틱이 차지하는 면적을 제 크기로 제한해
 * 나머지 화면 전체를 카메라 조작에 남긴다.
 */
function VirtualJoystick({ inputSource }: VirtualJoystickProps): ReactNode {
  // region [Hooks]
  const baseElementRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<KnobOffset>(ZERO_OFFSET);
  // endregion

  // region [Privates]
  /** 손가락 위치를 기준원 안으로 깎은 오프셋으로 바꾼다. */
  const resolveKnobOffset = useCallback((clientX: number, clientY: number): KnobOffset => {
    const baseElement = baseElementRef.current;

    if (!baseElement) {
      return ZERO_OFFSET;
    }

    const baseRect = baseElement.getBoundingClientRect();
    const rawX = clientX - (baseRect.left + baseRect.width / 2);
    const rawY = clientY - (baseRect.top + baseRect.height / 2);
    const rawDistance = Math.hypot(rawX, rawY);

    if (rawDistance <= JOYSTICK_BASE_RADIUS || rawDistance === 0) {
      return { x: rawX, y: rawY };
    }

    const clampRatio = JOYSTICK_BASE_RADIUS / rawDistance;

    return { x: rawX * clampRatio, y: rawY * clampRatio };
  }, []);

  const applyJoystickInput = useCallback(
    (offset: KnobOffset): void => {
      // 화면 위로 밀면 전진이므로 y 를 뒤집는다.
      inputSource.joystick.forward = -offset.y / JOYSTICK_BASE_RADIUS;
      inputSource.joystick.strafe = offset.x / JOYSTICK_BASE_RADIUS;
      inputSource.joystick.isRunning =
        Math.hypot(offset.x, offset.y) / JOYSTICK_BASE_RADIUS >= RUN_THRESHOLD_RATIO;
    },
    [inputSource],
  );

  const resetJoystickInput = useCallback((): void => {
    inputSource.joystick.forward = 0;
    inputSource.joystick.strafe = 0;
    inputSource.joystick.isRunning = false;
    setKnobOffset(ZERO_OFFSET);
  }, [inputSource]);
  // endregion

  // region [Events]
  const onPointerDownJoystickBase = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      if (activePointerIdRef.current !== null) {
        return;
      }

      activePointerIdRef.current = pointerEvent.pointerId;
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

      const offset = resolveKnobOffset(pointerEvent.clientX, pointerEvent.clientY);
      setKnobOffset(offset);
      applyJoystickInput(offset);
    },
    [applyJoystickInput, resolveKnobOffset],
  );

  const onPointerMoveJoystickBase = useCallback(
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

  const onPointerUpJoystickBase = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      if (pointerEvent.pointerId !== activePointerIdRef.current) {
        return;
      }

      activePointerIdRef.current = null;
      resetJoystickInput();
    },
    [resetJoystickInput],
  );
  // endregion

  return (
    <div
      ref={baseElementRef}
      role="presentation"
      aria-hidden="true"
      className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm touch-none select-none"
      style={{ width: JOYSTICK_BASE_RADIUS * 2, height: JOYSTICK_BASE_RADIUS * 2 }}
      onPointerDown={onPointerDownJoystickBase}
      onPointerMove={onPointerMoveJoystickBase}
      onPointerUp={onPointerUpJoystickBase}
      onPointerCancel={onPointerUpJoystickBase}
    >
      <div
        className="absolute rounded-full bg-bitcoin/75 shadow-lg"
        style={{
          width: JOYSTICK_KNOB_RADIUS * 2,
          height: JOYSTICK_KNOB_RADIUS * 2,
          left: JOYSTICK_BASE_RADIUS - JOYSTICK_KNOB_RADIUS,
          top: JOYSTICK_BASE_RADIUS - JOYSTICK_KNOB_RADIUS,
          transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
        }}
      />
    </div>
  );
}

const MemoizedVirtualJoystick = memo(VirtualJoystick);
MemoizedVirtualJoystick.displayName = "VirtualJoystick";

export default MemoizedVirtualJoystick;
