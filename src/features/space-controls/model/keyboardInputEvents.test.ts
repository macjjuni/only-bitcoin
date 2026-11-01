import { describe, expect, it } from "vitest";
import { attachSpaceKeyboardEvents, shouldIgnoreSpaceHotkey } from "./keyboardInputEvents";
import { createSpaceInputSource } from "./spaceInputSource";

/**
 * `closest` 를 실제 셀렉터와 맞춰 본다. 호출을 무조건 통과시키면 어떤 요소를
 * 입력 대상으로 보는지 자체를 검증하지 못한다.
 */
class KeyboardEventTarget extends EventTarget {
  /** 이 대상이 나타내는 태그. `input` 은 글자 입력, `button` 은 활성화 대상이다. */
  elementName: "canvas" | "input" | "button" = "canvas";

  get isEditable(): boolean {
    return this.elementName === "input";
  }

  set isEditable(nextEditable: boolean) {
    this.elementName = nextEditable ? "input" : "canvas";
  }

  closest(selector: string): object | null {
    return selector.split(", ").includes(this.elementName) ? this : null;
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

describe("shouldIgnoreSpaceHotkey", () => {
  const targetOf = (elementName: "canvas" | "input" | "button") => {
    const target = new KeyboardEventTarget();
    target.elementName = elementName;
    return target;
  };

  it("입력창과 버튼에서는 전역 단축키를 흘려보낸다", () => {
    // 글자를 치는 중이면 그 키는 입력창 몫이고, 버튼이면 브라우저가 활성화한다.
    expect(shouldIgnoreSpaceHotkey(targetOf("input"))).toBe(true);
    expect(shouldIgnoreSpaceHotkey(targetOf("button"))).toBe(true);
  });

  it("캔버스에서는 전역 단축키를 받는다", () => {
    expect(shouldIgnoreSpaceHotkey(targetOf("canvas"))).toBe(false);
    expect(shouldIgnoreSpaceHotkey(null)).toBe(false);
  });
});

describe("공간 키보드와 채팅 입력 격리", () => {
  it("이동·회전 키를 합산하고 방향키의 스크롤을 막는다", () => {
    const { inputSource, windowEvents, detach } = createKeyboard();
    expect(windowEvents.emitKey("keydown", "ArrowUp").defaultPrevented).toBe(true);
    windowEvents.emitKey("keydown", "KeyQ");
    windowEvents.emitKey("keydown", "ShiftLeft");
    expect(inputSource.keyboard).toEqual({ forward: 1, strafe: 0, isRunning: true, isJumping: false });
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

  it("HUD 버튼에 포커스가 남아도 이동 키는 계속 받는다", () => {
    const { inputSource, windowEvents, detach } = createKeyboard();
    windowEvents.elementName = "button";
    windowEvents.emitKey("keydown", "KeyW");
    windowEvents.emitKey("keydown", "KeyD");
    expect(inputSource.keyboard).toEqual({ forward: 1, strafe: 1, isRunning: false, isJumping: false });
    // 포커스된 버튼의 공백 활성화는 그대로 브라우저에 남긴다.
    expect(windowEvents.emitKey("keydown", "Space").defaultPrevented).toBe(false);
    // 방향키는 버튼을 활성화하지 않으므로 스크롤만 막는다.
    expect(windowEvents.emitKey("keydown", "ArrowUp").defaultPrevented).toBe(true);
    detach();
  });

  it("버튼에 포커스가 있어도 포커스 이동만으로 키를 비우지 않는다", () => {
    const { inputSource, windowEvents, documentEvents, detach } = createKeyboard();
    windowEvents.emitKey("keydown", "KeyW");
    documentEvents.elementName = "button";
    documentEvents.dispatchEvent(new Event("focusin"));
    expect(inputSource.keyboard.forward).toBe(1);
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
