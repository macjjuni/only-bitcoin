import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDelayedSocket, resolveDebugSocketDelayMs } from "./delayedSocket";
import type { SpaceSessionSocket } from "./spaceSessionController";

const createFakeSocket = () => {
  const listeners = new Map<string, EventListener[]>();
  const sent: string[] = [];
  const socket = {
    readyState: 1,
    bufferedAmount: 0,
    binaryType: "blob" as BinaryType,
    addEventListener: (type: string, listener: EventListener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    send: (payload: string) => {
      sent.push(payload);
    },
    close: vi.fn(),
  };
  const emit = (type: string, data?: unknown): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener({ type, data } as unknown as Event);
    }
  };

  return { socket: socket as SpaceSessionSocket & { readyState: number }, sent, emit };
};

describe("resolveDebugSocketDelayMs", () => {
  it("개발 모드에서만 lag 값을 읽고 잘못된 값은 0으로 봄", () => {
    expect(resolveDebugSocketDelayMs("?lag=200", true)).toBe(200);
    expect(resolveDebugSocketDelayMs("?lag=200", false)).toBe(0);
    expect(resolveDebugSocketDelayMs("?lag=abc", true)).toBe(0);
    expect(resolveDebugSocketDelayMs("?lag=-5", true)).toBe(0);
    expect(resolveDebugSocketDelayMs("", true)).toBe(0);
    expect(resolveDebugSocketDelayMs("?lag=99999", true)).toBe(2000);
  });
});

describe("createDelayedSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("송신을 지연만큼 늦추고 순서를 지킴", () => {
    const { socket, sent } = createFakeSocket();
    const delayed = createDelayedSocket(socket, 200);

    delayed.send("a");
    vi.advanceTimersByTime(100);
    delayed.send("b");
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(sent).toEqual(["a"]);
    vi.advanceTimersByTime(100);
    expect(sent).toEqual(["a", "b"]);
  });

  it("수신만 늦추고 연결 이벤트는 바로 넘김", () => {
    const { socket, emit } = createFakeSocket();
    const delayed = createDelayedSocket(socket, 200);
    const onMessage = vi.fn();
    const onOpen = vi.fn();
    delayed.addEventListener("message", onMessage);
    delayed.addEventListener("open", onOpen);

    emit("open");
    emit("message", "x");
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onMessage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it("지연 중에 닫힌 소켓에는 보내지 않고 상태 값은 그대로 전달함", () => {
    const { socket, sent } = createFakeSocket();
    const delayed = createDelayedSocket(socket, 200);

    delayed.binaryType = "arraybuffer";
    expect(socket.binaryType).toBe("arraybuffer");
    delayed.send("a");
    socket.readyState = 3;
    vi.advanceTimersByTime(200);
    expect(sent).toEqual([]);
    expect(delayed.readyState).toBe(3);
    delayed.close(1000, "bye");
    expect(socket.close).toHaveBeenCalledWith(1000, "bye");
  });
});
