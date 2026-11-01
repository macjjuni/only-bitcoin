import type { SpaceInputSource } from "./spaceInputSource";

const FORWARD_CODES = ["KeyW", "ArrowUp"] as const;
const BACKWARD_CODES = ["KeyS", "ArrowDown"] as const;
const STRAFE_LEFT_CODES = ["KeyA", "ArrowLeft"] as const;
const STRAFE_RIGHT_CODES = ["KeyD", "ArrowRight"] as const;
const RUN_CODES = ["ShiftLeft", "ShiftRight"] as const;
const YAW_LEFT_CODES = ["KeyQ"] as const;
const YAW_RIGHT_CODES = ["KeyE"] as const;
const JUMP_CODES = ["Space"] as const;

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
  ...JUMP_CODES,
]);

/**
 * 키 입력을 그대로 넘겨야 하는 대상.
 *
 * 글자를 받거나 방향키로 스크롤하는 요소만 넣는다. 버튼·링크까지 넣으면 HUD
 * 버튼을 한 번 누른 뒤 포커스가 남아 WASD 가 전부 죽는다.
 */
const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [role="log"], [contenteditable]:not([contenteditable="false"])';

/** 포커스된 상태에서 Enter 로 활성화되는 대상. 이동 키는 그대로 받는다. */
const ACTIVATION_SELECTOR = 'button, a[href], summary, [role="button"], [role="link"]';

const matchesSelector = (target: EventTarget | null, selector: string): boolean => {
  return Boolean(
    target &&
      "closest" in target &&
      typeof target.closest === "function" &&
      target.closest(selector),
  );
};

const isTextEntryTarget = (target: EventTarget | null): boolean => {
  return matchesSelector(target, TEXT_ENTRY_SELECTOR);
};

const isActivationTarget = (target: EventTarget | null): boolean => {
  return matchesSelector(target, ACTIVATION_SELECTOR);
};

/**
 * 전역 단축키를 흘려보내야 하는 대상인지.
 *
 * 글자를 입력 중이면 그 키는 입력창 몫이고, 버튼·링크에 포커스가 있으면
 * 브라우저가 기본 활성화를 처리한다. 둘 다 가로채면 Enter 한 번에 두 가지
 * 일이 일어난다. 셀렉터를 HUD 쪽에 복사하지 않도록 여기서 한 번만 정의한다.
 */
export const shouldIgnoreSpaceHotkey = (target: EventTarget | null): boolean => {
  return isTextEntryTarget(target) || isActivationTarget(target);
};

/** 입력창 포커스·탭 전환 시 눌린 키를 비워 채팅 중 이동과 고착 입력을 막는다. */
export const attachSpaceKeyboardEvents = (
  inputSource: SpaceInputSource,
  windowEvents: EventTarget,
  documentEvents: EventTarget,
): (() => void) => {
  const pressedCodes = new Set<string>();
  const hasAnyPressed = (codes: readonly string[]): boolean => {
    return codes.some((code) => pressedCodes.has(code));
  };
  const applyPressedCodes = (): void => {
    inputSource.keyboard.forward =
      Number(hasAnyPressed(FORWARD_CODES)) - Number(hasAnyPressed(BACKWARD_CODES));
    inputSource.keyboard.strafe =
      Number(hasAnyPressed(STRAFE_RIGHT_CODES)) - Number(hasAnyPressed(STRAFE_LEFT_CODES));
    inputSource.keyboard.isRunning = hasAnyPressed(RUN_CODES);
    inputSource.keyboard.isJumping = hasAnyPressed(JUMP_CODES);
    inputSource.yawDirection =
      Number(hasAnyPressed(YAW_LEFT_CODES)) - Number(hasAnyPressed(YAW_RIGHT_CODES));
  };
  const clearPressedCodes = (): void => {
    pressedCodes.clear();
    applyPressedCodes();
  };
  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (
      isTextEntryTarget(keyboardEvent.target) ||
      keyboardEvent.isComposing ||
      keyboardEvent.ctrlKey ||
      keyboardEvent.metaKey ||
      keyboardEvent.altKey
    ) {
      clearPressedCodes();
      return;
    }
    /*
     * 공백은 **항상 점프**다. 포커스된 버튼의 공백 활성화를 브라우저에 남겨
     * 뒀더니, 채팅을 닫을 때 포커스가 토글 버튼으로 돌아가(`onClickCloseChat`)
     * 그 다음 공백이 점프와 채팅 열기를 한 번에 일으켰다.
     *
     * 버튼은 Tab 으로 가서 Enter 로 누를 수 있으므로 키보드 조작이 막히지
     * 않는다. 공백으로도 눌리는 것은 Enter 와 겹치는 기능이고, 이 화면에서
     * 공백은 게임 조작이다. 겹칠 때는 게임 조작이 이긴다.
     */
    if (SCROLL_BLOCKING_CODES.has(keyboardEvent.code)) {
      keyboardEvent.preventDefault();
    }
    if (ALL_HANDLED_CODES.has(keyboardEvent.code)) {
      pressedCodes.add(keyboardEvent.code);
      applyPressedCodes();
    }
  };
  const onKeyUp = (event: Event): void => {
    pressedCodes.delete((event as KeyboardEvent).code);
    applyPressedCodes();
  };
  const onFocusInput = (event: Event): void => {
    if (isTextEntryTarget(event.target)) {
      clearPressedCodes();
    }
  };
  windowEvents.addEventListener("keydown", onKeyDown, { passive: false });
  windowEvents.addEventListener("keyup", onKeyUp);
  windowEvents.addEventListener("blur", clearPressedCodes);
  documentEvents.addEventListener("focusin", onFocusInput);
  documentEvents.addEventListener("visibilitychange", clearPressedCodes);
  return () => {
    windowEvents.removeEventListener("keydown", onKeyDown);
    windowEvents.removeEventListener("keyup", onKeyUp);
    windowEvents.removeEventListener("blur", clearPressedCodes);
    documentEvents.removeEventListener("focusin", onFocusInput);
    documentEvents.removeEventListener("visibilitychange", clearPressedCodes);
    clearPressedCodes();
  };
};
