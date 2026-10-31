"use client";

import { useEffect } from "react";
import type { SpaceInputSource } from "./spaceInputSource";

const FORWARD_CODES = ["KeyW", "ArrowUp"] as const;
const BACKWARD_CODES = ["KeyS", "ArrowDown"] as const;
const STRAFE_LEFT_CODES = ["KeyA", "ArrowLeft"] as const;
const STRAFE_RIGHT_CODES = ["KeyD", "ArrowRight"] as const;
const RUN_CODES = ["ShiftLeft", "ShiftRight"] as const;
const YAW_LEFT_CODES = ["KeyQ"] as const;
const YAW_RIGHT_CODES = ["KeyE"] as const;

/** 브라우저 기본 스크롤을 막아야 하는 키. */
const SCROLL_BLOCKING_CODES = new Set<string>([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

const ALL_HANDLED_CODES = new Set<string>([
  ...FORWARD_CODES,
  ...BACKWARD_CODES,
  ...STRAFE_LEFT_CODES,
  ...STRAFE_RIGHT_CODES,
  ...RUN_CODES,
  ...YAW_LEFT_CODES,
  ...YAW_RIGHT_CODES,
]);

/**
 * 키보드 입력을 입력 수집 지점에 반영한다.
 *
 * 드래그 없이도 시야를 돌릴 수 있도록 `Q`/`E` 를 함께 받는다. 키보드만으로
 * 이동과 시야 회전이 모두 가능해야 한다.
 */
const useKeyboardInput = (inputSource: SpaceInputSource): void => {
  // region [Life Cycles]
  useEffect(() => {
    const pressedCodes = new Set<string>();

    const hasAnyPressed = (codes: readonly string[]): boolean => {
      return codes.some((code) => pressedCodes.has(code));
    };

    const applyPressedCodes = (): void => {
      const forward = Number(hasAnyPressed(FORWARD_CODES)) - Number(hasAnyPressed(BACKWARD_CODES));
      const strafe =
        Number(hasAnyPressed(STRAFE_RIGHT_CODES)) - Number(hasAnyPressed(STRAFE_LEFT_CODES));

      inputSource.keyboard.forward = forward;
      inputSource.keyboard.strafe = strafe;
      inputSource.keyboard.isRunning = hasAnyPressed(RUN_CODES);
      inputSource.yawDirection =
        Number(hasAnyPressed(YAW_RIGHT_CODES)) - Number(hasAnyPressed(YAW_LEFT_CODES));
    };

    const clearPressedCodes = (): void => {
      pressedCodes.clear();
      applyPressedCodes();
    };

    const onKeyDown = (keyboardEvent: KeyboardEvent): void => {
      if (SCROLL_BLOCKING_CODES.has(keyboardEvent.code)) {
        keyboardEvent.preventDefault();
      }
      if (!ALL_HANDLED_CODES.has(keyboardEvent.code)) {
        return;
      }

      pressedCodes.add(keyboardEvent.code);
      applyPressedCodes();
    };

    const onKeyUp = (keyboardEvent: KeyboardEvent): void => {
      if (!ALL_HANDLED_CODES.has(keyboardEvent.code)) {
        return;
      }

      pressedCodes.delete(keyboardEvent.code);
      applyPressedCodes();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    // 탭이나 창을 벗어나면 keyup 이 오지 않아 키가 눌린 채로 남는다.
    window.addEventListener("blur", clearPressedCodes);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearPressedCodes);
      clearPressedCodes();
    };
  }, [inputSource]);
  // endregion
};

export default useKeyboardInput;
