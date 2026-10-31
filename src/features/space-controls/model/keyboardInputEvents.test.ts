import { describe, expect, it } from "vitest";
import { attachSpaceKeyboardEvents } from "./keyboardInputEvents";
import { createSpaceInputSource } from "./spaceInputSource";

class KeyboardEventTarget extends EventTarget {
  isEditable = false;

  closest(): object | null {
    return this.isEditable ? this : null;
  }

  emitKey(type: string, code: string, properties = {}): Event {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, ...properties });
    this.dispatchEvent(event);
    return event;
  }
}

const createKeyboard = () => {
  const inputSource = createSpaceInputSource();
  const windowEvents = new KeyboardEventTarget();
  const documentEvents = new KeyboardEventTarget();
  const detach = attachSpaceKeyboardEvents(inputSource, windowEvents, documentEvents);
  return { inputSource, windowEvents, documentEvents, detach };
};

describe("공간 키보드와 채팅 입력 격리", () => {
  it("이동·회전 키를 합산하고 방향키의 스크롤을 막는다", () => {
    const { inputSource, windowEvents, detach } = createKeyboard();
    expect(windowEvents.emitKey("keydown", "ArrowUp").defaultPrevented).toBe(true);
    windowEvents.emitKey("keydown", "KeyQ");
    windowEvents.emitKey("keydown", "ShiftLeft");
    expect(inputSource.keyboard).toEqual({ forward: 1, strafe: 0, isRunning: true });
    expect(inputSource.yawDirection).toBe(1);
    windowEvents.emitKey("keyup", "ArrowUp");
    expect(inputSource.keyboard.forward).toBe(0);
    detach();
  });

  it("입력창의 방향키·공백은 브라우저에 남기고 캐릭터를 움직이지 않는다", () => {
    const { inputSource, windowEvents, detach } = createKeyboard();
    windowEvents.isEditable = true;
    expect(windowEvents.emitKey("keydown", "ArrowUp").defaultPrevented).toBe(false);
    expect(windowEvents.emitKey("keydown", "Space").defaultPrevented).toBe(false);
    windowEvents.emitKey("keydown", "KeyW");
    windowEvents.emitKey("keydown", "KeyE");
    expect(inputSource.keyboard.forward).toBe(0);
    expect(inputSource.yawDirection).toBe(0);
    detach();
  });

  it("키를 누른 채 입력창에 포커스하거나 탭을 숨기면 즉시 비운다", () => {
    const { inputSource, windowEvents, documentEvents, detach } = createKeyboard();
    windowEvents.emitKey("keydown", "KeyW");
    documentEvents.isEditable = true;
    documentEvents.dispatchEvent(new Event("focusin"));
    expect(inputSource.keyboard.forward).toBe(0);
    windowEvents.emitKey("keydown", "KeyD");
    documentEvents.dispatchEvent(new Event("visibilitychange"));
    expect(inputSource.keyboard.strafe).toBe(0);
    detach();
  });

  it("한글 조합·브라우저 단축키 입력을 이동으로 해석하지 않는다", () => {
    const { inputSource, windowEvents, detach } = createKeyboard();
    windowEvents.emitKey("keydown", "KeyW", { isComposing: true });
    windowEvents.emitKey("keydown", "KeyD", { ctrlKey: true });
    expect(inputSource.keyboard.forward).toBe(0);
    expect(inputSource.keyboard.strafe).toBe(0);
    detach();
    windowEvents.emitKey("keydown", "KeyW");
    expect(inputSource.keyboard.forward).toBe(0);
  });
});
