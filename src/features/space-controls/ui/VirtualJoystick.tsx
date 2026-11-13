"use client";

import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
/** 네 방향 눈금을 놓는 각도(도). 위가 0 이고 시계 방향임. */
const DIRECTION_TICK_ANGLES = [0, 90, 180, 270] as const;
/** 눈금을 가운데서 띄우는 거리(px). 손잡이가 쉬는 자리 바깥임. */
const DIRECTION_TICK_DISTANCE = 40;
/** 바탕 판의 겉모양. 상태마다 테두리와 바탕색만 다름. */
const BASE_STATE_CLASS = {
  idle: "border-white/20 bg-[radial-gradient(circle,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.10)_100%)]",
  active:
    "border-white/35 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.16)_100%)]",
  running:
    "border-bitcoin/70 bg-[radial-gradient(circle,rgba(247,147,26,0.10)_0%,rgba(247,147,26,0.22)_100%)]",
} as const;

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
    const pointerID = activePointerIdRef.current;
    activePointerIdRef.current = null;
    const baseElement = baseElementRef.current;
    if (pointerID !== null && baseElement?.hasPointerCapture(pointerID)) {
      baseElement.releasePointerCapture(pointerID);
    }
    inputSource.joystick.forward = 0;
    inputSource.joystick.strafe = 0;
    inputSource.joystick.isRunning = false;
    setKnobOffset(ZERO_OFFSET);
  }, [inputSource]);
  // endregion

  // region [Events]
  const onPointerDownJoystickBase = useCallback(
    (pointerEvent: React.PointerEvent<HTMLDivElement>): void => {
      const activePointerId = activePointerIdRef.current;

      if (activePointerId !== null) {
        // 진짜로 누르고 있는 손가락은 캡처를 쥐고 있음. 캡처가 없으면 떼는 이벤트를
        // 놓쳐 남은 기록이라 새 터치가 넘겨받음. 안 그러면 마지막 방향으로 계속 걷고
        // 다시 눌러도 안 풀렸음.
        if (pointerEvent.currentTarget.hasPointerCapture(activePointerId)) {
          return;
        }

        resetJoystickInput();
      }

      activePointerIdRef.current = pointerEvent.pointerId;
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);

      const offset = resolveKnobOffset(pointerEvent.clientX, pointerEvent.clientY);
      setKnobOffset(offset);
      applyJoystickInput(offset);
    },
    [applyJoystickInput, resolveKnobOffset, resetJoystickInput],
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

      resetJoystickInput();
    },
    [resetJoystickInput],
  );
  // endregion

  // region [Privates]
  /**
   * 조이스틱 밖에서 끝난 손가락도 잡아냄.
   *
   * 모바일 브라우저(특히 iOS Safari)는 가장자리 스와이프·알림·캡처 상실 때 떼는
   * 이벤트를 조이스틱에 안 보내기도 함. 창 전체에서 같은 손가락이 끝나면 풂.
   */
  const onPointerEndWindow = useCallback(
    (pointerEvent: PointerEvent): void => {
      if (pointerEvent.pointerId === activePointerIdRef.current) {
        resetJoystickInput();
      }
    },
    [resetJoystickInput],
  );

  /** 화면에 남은 손가락이 하나도 없는데 조이스틱이 눌린 채면 무조건 풂. 마지막 안전망임. */
  const onTouchEndWindow = useCallback(
    (touchEvent: TouchEvent): void => {
      if (touchEvent.touches.length === 0 && activePointerIdRef.current !== null) {
        resetJoystickInput();
      }
    },
    [resetJoystickInput],
  );

  const attachJoystickResetEvents = useCallback((): (() => void) => {
    window.addEventListener("blur", resetJoystickInput);
    document.addEventListener("visibilitychange", resetJoystickInput);
    window.addEventListener("pointerup", onPointerEndWindow, true);
    window.addEventListener("pointercancel", onPointerEndWindow, true);
    window.addEventListener("touchend", onTouchEndWindow, true);
    window.addEventListener("touchcancel", onTouchEndWindow, true);
    return () => {
      window.removeEventListener("blur", resetJoystickInput);
      document.removeEventListener("visibilitychange", resetJoystickInput);
      window.removeEventListener("pointerup", onPointerEndWindow, true);
      window.removeEventListener("pointercancel", onPointerEndWindow, true);
      window.removeEventListener("touchend", onTouchEndWindow, true);
      window.removeEventListener("touchcancel", onTouchEndWindow, true);
      activePointerIdRef.current = null;
      inputSource.joystick.forward = 0;
      inputSource.joystick.strafe = 0;
      inputSource.joystick.isRunning = false;
    };
  }, [inputSource, resetJoystickInput, onPointerEndWindow, onTouchEndWindow]);
  // endregion

  // region [Life Cycles]
  useEffect(attachJoystickResetEvents, [attachJoystickResetEvents]);
  // endregion

  // region [Templates]
  const isActive = knobOffset !== ZERO_OFFSET;
  /** 달리기 구간까지 밀었는지. 입력 판정과 같은 기준임. */
  const isRunning =
    Math.hypot(knobOffset.x, knobOffset.y) / JOYSTICK_BASE_RADIUS >= RUN_THRESHOLD_RATIO;
  const baseState = isRunning ? "running" : isActive ? "active" : "idle";
  // endregion

  return (
    <div
      ref={baseElementRef}
      role="presentation"
      aria-hidden="true"
      className={`absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border backdrop-blur-md touch-none select-none shadow-[0_4px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[border-color,background-color] duration-150 ${BASE_STATE_CLASS[baseState]}`}
      style={{
        width: JOYSTICK_BASE_RADIUS * 2,
        height: JOYSTICK_BASE_RADIUS * 2,
        bottom: "calc(4rem + env(safe-area-inset-bottom))",
      }}
      onPointerDown={onPointerDownJoystickBase}
      onPointerMove={onPointerMoveJoystickBase}
      onPointerUp={onPointerUpJoystickBase}
      onPointerCancel={onPointerUpJoystickBase}
      onLostPointerCapture={onPointerUpJoystickBase}
    >
      {/* 달리기 구간이 시작되는 선. 여기를 넘기면 달림. */}
      <div
        className={`pointer-events-none absolute rounded-full border border-dashed transition-colors duration-150 ${
          isRunning ? "border-bitcoin/60" : "border-white/15"
        }`}
        style={{ inset: JOYSTICK_BASE_RADIUS * (1 - RUN_THRESHOLD_RATIO) }}
      />

      {DIRECTION_TICK_ANGLES.map((angle) => (
        <span
          key={angle}
          className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white/30"
          style={{
            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${DIRECTION_TICK_DISTANCE}px)`,
          }}
        />
      ))}

      {/* 손을 떼면 가운데로 부드럽게 돌아감. 누르는 동안에는 전환 없이 손가락을 바로 따라감. */}
      <div
        className={`absolute rounded-full border border-white/40 bg-gradient-to-b from-[#ffb04d] to-bitcoin shadow-[0_3px_10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] ${
          isActive ? "" : "opacity-80 transition-transform duration-150 ease-out"
        } ${isRunning ? "ring-2 ring-bitcoin/50" : ""}`}
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
