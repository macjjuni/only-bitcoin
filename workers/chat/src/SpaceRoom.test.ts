import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveColorIndexFromClientKey } from "../../../src/entities/space/lib/clientKeyHash";
import { decodeSpaceSnapshot } from "../../../src/entities/space/lib/spaceSnapshot";
import { createSpawnPoint } from "../../../src/entities/space/lib/spawnPoint";
import type { SpacePeer, SpaceServerFrame } from "../../../src/entities/space/model/spaceProtocol";
import { SPACE_BOUNDS } from "../../../src/entities/space/model/spaceWorld";

vi.mock("cloudflare:workers", () => ({ DurableObject: class {} }));

import { SpaceRoom } from "./SpaceRoom";
import type { ChatWorkerEnv } from "./types";

class RoomSocket {
  readyState = 1;
  sent: Array<string | ArrayBuffer> = [];
  closeCode: number | null = null;
  shouldFailSend = false;
  private attachment: unknown;

  constructor(ipGuardKey = "test-ip") {
    this.attachment = {
      v: 1,
      joined: false,
      ipGuardKey,
      joinDeadlineAt: Date.now() + 10_000,
      lastActivityAt: Date.now(),
      lastMoveAt: Date.now(),
      movementBudget: 0.5,
      lastSayAt: null,
      recentSayReceipts: [],
    };
  }

  serializeAttachment(attachment: unknown): void {
    this.attachment = structuredClone(attachment);
  }

  deserializeAttachment(): unknown {
    return structuredClone(this.attachment);
  }

  send(payload: string | ArrayBuffer): void {
    if (this.readyState !== 1 || this.shouldFailSend) {
      throw new Error("Socket is closed");
    }
    this.sent.push(payload);
  }

  close(code: number): void {
    this.readyState = 2;
    this.closeCode = code;
  }

  frames(): SpaceServerFrame[] {
    return this.sent.flatMap((payload) =>
      typeof payload === "string" ? [JSON.parse(payload)] : [],
    );
  }

  peer(): SpacePeer {
    return (this.deserializeAttachment() as { peer: SpacePeer }).peer;
  }

  asWebSocket(): WebSocket {
    return this as unknown as WebSocket;
  }
}

class RoomState {
  sockets: RoomSocket[] = [];
  autoResponses = new Map<WebSocket, Date>();
  setWebSocketAutoResponse = vi.fn();
  storage = { sql: { exec: vi.fn() } };

  getWebSockets(): WebSocket[] {
    return this.sockets.map((socket) => socket.asWebSocket());
  }

  getWebSocketAutoResponseTimestamp(socket: WebSocket): Date | null {
    return this.autoResponses.get(socket) ?? null;
  }

  asDurableState(): DurableObjectState {
    return this as unknown as DurableObjectState;
  }
}

const workerEnv = { ENFORCEMENT_SECRET: "test-enforcement-secret" } as ChatWorkerEnv;

const createRoom = (state = new RoomState()) => {
  const room = new SpaceRoom(state.asDurableState(), workerEnv);
  const send = (socket: RoomSocket, frame: unknown) =>
    room.webSocketMessage(socket.asWebSocket(), JSON.stringify(frame));
  const join = async (clientKey: string, nickname = "참여자") => {
    const socket = new RoomSocket();
    state.sockets.push(socket);
    await send(socket, { v: 1, t: "join", clientKey, nickname });
    return socket;
  };

  return { state, room, send, join };
};

const requestId = "11111111-1111-4111-8111-111111111111";
const otherRequestId = "22222222-2222-4222-8222-222222222222";
const clientKey = (index: number): string => `client-key-${String(index).padStart(22, "0")}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T00:00:00Z"));
  vi.stubGlobal(
    "WebSocketRequestResponsePair",
    class {
      constructor(
        readonly request: string,
        readonly response: string,
      ) {}
    },
  );
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SpaceRoom", () => {
  it("서버가 50석을 배정하고 51번째 입장은 full로 종료한다", async () => {
    const { join, state } = createRoom();
    const seats = new Set<number>();

    for (let index = 0; index < 50; index += 1) {
      const socket = await join(clientKey(index));
      seats.add(socket.peer().seat);
    }
    const overflow = await join(clientKey(50));

    expect(seats.size).toBe(50);
    expect(overflow.frames()).toContainEqual({ v: 1, t: "full" });
    expect(overflow.closeCode).toBe(4003);
    expect(state.storage.sql.exec).not.toHaveBeenCalled();
  });

  it("스폰 좌표와 색을 clientKey 로 내려 클라이언트 예측과 일치시킨다", async () => {
    const { join } = createRoom();
    const socket = await join(clientKey(7));
    const welcome = socket.frames().find((frame) => frame.t === "welcome");

    // 클라이언트는 비밀키를 모르므로 stableActorKey 로 파생하면 예측할 수 없다.
    // 두 값이 어긋나면 입장 직후 아바타가 순간이동하고 색이 바뀐다.
    expect(welcome).toMatchObject({
      self: {
        ...createSpawnPoint(clientKey(7)),
        colorIndex: resolveColorIndexFromClientKey(clientKey(7)),
      },
    });
  });

  it("같은 identity 재접속은 좌석·위치를 넘기고 구소켓 close는 새 좌석을 지우지 않는다", async () => {
    const { room, join, send } = createRoom();
    const previous = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const original = previous.peer();
    vi.advanceTimersByTime(100);
    await send(previous, {
      v: 1,
      t: "move",
      x: original.x + 0.5,
      y: 0,
      z: original.z,
      yaw: 0,
      isRunning: true,
    });
    const replacement = await join(clientKey(1));
    room.webSocketClose(previous.asWebSocket());

    expect(previous.closeCode).toBe(4001);
    expect(replacement.peer()).toMatchObject({ seat: original.seat, x: original.x + 0.5 });
    expect(observer.frames().filter((frame) => frame.t === "leave")).toHaveLength(0);
    expect(replacement.frames().some((frame) => frame.t === "welcome")).toBe(true);
  });

  it("종료 시 attachment가 사라져도 socket 소유권으로 좌석을 반환한다", async () => {
    const { room, join } = createRoom();
    const departing = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const seat = departing.peer().seat;
    departing.readyState = 3;
    departing.serializeAttachment(null);
    room.webSocketClose(departing.asWebSocket());
    const arriving = await join(clientKey(3));

    expect(observer.frames()).toContainEqual({ v: 1, t: "leave", seat });
    expect(arriving.peer().seat).toBe(seat);
  });

  it.each([
    2, 3,
  ])("readyState %s의 close로 깨어나도 attachment 좌석의 leave를 보낸다", async (readyState) => {
    const { state, join } = createRoom();
    const departing = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const seat = departing.peer().seat;
    departing.readyState = readyState;

    if (readyState === 3) {
      state.sockets = state.sockets.filter((socket) => socket !== departing);
    }
    const restored = createRoom(state);
    observer.sent = [];
    restored.room.webSocketClose(departing.asWebSocket());

    expect(observer.frames()).toContainEqual({ v: 1, t: "leave", seat });
    expect((await restored.join(clientKey(3))).peer().seat).toBe(seat);
  });

  it("cold close의 attachment도 없으면 현재 roster 전체로 유령 좌석을 제거한다", async () => {
    const { state, join } = createRoom();
    const departing = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const remaining = await join(clientKey(3));
    departing.readyState = 3;
    departing.serializeAttachment(null);
    state.sockets = state.sockets.filter((socket) => socket !== departing);
    const restored = createRoom(state);
    observer.sent = [];
    restored.room.webSocketClose(departing.asWebSocket());

    expect(observer.frames()).toContainEqual({
      v: 1,
      t: "welcome",
      self: observer.peer(),
      peers: [remaining.peer()],
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cold close의 오래된 attachment는 같은 좌석의 새 owner를 퇴장시키지 않는다", async () => {
    const { state, join } = createRoom();
    const previous = await join(clientKey(1));
    const oldAttachment = previous.deserializeAttachment();
    const observer = await join(clientKey(2));
    const replacement = await join(clientKey(1));
    previous.serializeAttachment(oldAttachment);
    const restored = createRoom(state);
    observer.sent = [];
    restored.room.webSocketClose(previous.asWebSocket());

    expect(observer.frames().some((frame) => frame.t === "leave")).toBe(false);
    expect(replacement.peer().seat).toBe(0);
    expect((await restored.join(clientKey(3))).peer().seat).toBe(2);
  });

  it("welcome 전송이 실패하면 퇴장 뒤에 유령 peer 입장을 알리지 않는다", async () => {
    const { state, join, send } = createRoom();
    const observer = await join(clientKey(1));
    observer.sent = [];
    const failed = new RoomSocket();
    failed.shouldFailSend = true;
    state.sockets.push(failed);
    await send(failed, { v: 1, t: "join", clientKey: clientKey(2), nickname: "참여자" });

    expect(observer.frames().filter((frame) => frame.t === "peer")).toHaveLength(0);
    expect(observer.frames()).toContainEqual({ v: 1, t: "leave", seat: 1 });
  });

  it("변경 좌석만 100ms에 한 번 인코딩하고 움직임이 없으면 타이머·전송이 없다", async () => {
    const { join, send } = createRoom();
    const first = await join(clientKey(1));
    const second = await join(clientKey(2));
    first.sent = [];
    second.sent = [];
    vi.advanceTimersByTime(100);
    await send(first, { v: 1, t: "move", ...first.peer(), x: first.peer().x + 0.4 });
    await send(second, { v: 1, t: "move", ...second.peer(), z: second.peer().z + 0.4 });
    vi.advanceTimersByTime(99);
    expect(first.sent).toHaveLength(0);
    vi.advanceTimersByTime(1);

    const firstSnapshot = first.sent[0] as ArrayBuffer;
    expect(decodeSpaceSnapshot(firstSnapshot)?.players.map((player) => player.seat)).toEqual([
      0, 1,
    ]);
    expect(second.sent[0]).toBe(firstSnapshot);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(first.sent).toHaveLength(1);
  });

  it("순간이동은 거절해 서버 위치로 보정하고 긴 백그라운드 간격의 정상 이동은 허용한다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));
    const original = socket.peer();
    vi.advanceTimersByTime(100);
    await send(socket, { v: 1, t: "move", ...original, x: original.x + 5 });

    expect(socket.peer().x).toBe(original.x);
    expect(socket.frames()).toContainEqual({ v: 1, t: "peer", peer: original });
    vi.advanceTimersByTime(15_000);
    await send(socket, {
      v: 1,
      t: "move",
      ...original,
      x: SPACE_BOUNDS.maxX,
      z: SPACE_BOUNDS.minZ,
    });
    expect(socket.peer()).toMatchObject({ x: SPACE_BOUNDS.maxX, z: SPACE_BOUNDS.minZ });
  });

  it("attachment에서 재구성한 roster는 원래 좌석을 유지하고 SQL을 읽거나 쓰지 않는다", async () => {
    const { join, state } = createRoom();
    const first = await join(clientKey(1));
    const restored = createRoom(state);
    const second = await restored.join(clientKey(2));
    const welcome = second.frames().find((frame) => frame.t === "welcome");

    expect(welcome).toMatchObject({ peers: [first.peer()] });
    expect(state.setWebSocketAutoResponse).toHaveBeenCalledTimes(2);
    expect(state.storage.sql.exec).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("재전송 rid는 sender에만 같은 ID를 echo하며 3초 쿨다운과 본문 재사용을 검증한다", async () => {
    const { join, send } = createRoom();
    const sender = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const rid = crypto.randomUUID();
    const frame = { v: 1, t: "say", rid, body: "함께 지켜봐요" };
    await send(sender, frame);
    await send(sender, frame);
    const echoes = sender.frames().filter((item) => item.t === "say");

    expect(echoes).toHaveLength(2);
    expect(echoes[0]).toEqual(echoes[1]);
    expect(observer.frames().filter((item) => item.t === "say")).toHaveLength(1);
    await send(sender, { ...frame, body: "다른 내용" });
    expect(sender.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "REQUEST_ID_REUSED", rid }),
    );
    await send(sender, { ...frame, rid: crypto.randomUUID() });
    expect(sender.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "RATE_SAY_INTERVAL" }),
    );
    vi.advanceTimersByTime(3000);
    await send(sender, { ...frame, rid: crypto.randomUUID() });
    expect(observer.frames().filter((item) => item.t === "say")).toHaveLength(2);
  });

  it("공간 채팅은 복합 이모지 100자는 허용하고 101자는 거부한다", async () => {
    const { join, send } = createRoom();
    const sender = await join(clientKey(1));
    const body = Array.from({ length: 100 }, (_, index) =>
      index % 2 === 0 ? "👨‍👩‍👧‍👦" : "👩‍👩‍👧‍👧",
    ).join("");
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(2048);
    await send(sender, { v: 1, t: "say", rid: crypto.randomUUID(), body: `${body}👨‍👩‍👧‍👦` });
    expect(sender.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "BODY_TOO_LONG" }),
    );
    expect(sender.frames().some((frame) => frame.t === "say")).toBe(false);

    await send(sender, { v: 1, t: "say", rid: crypto.randomUUID(), body });
    expect(sender.frames().some((frame) => frame.t === "say")).toBe(true);
  });

  it("네이티브 ping 시각이 갱신되는 정지 사용자는 유지하고 유령 좌석만 회수한다", async () => {
    const { join, state } = createRoom();
    const idle = await join(clientKey(1));
    const alive = await join(clientKey(2));
    vi.advanceTimersByTime(61_000);
    state.autoResponses.set(alive.asWebSocket(), new Date());
    await join(clientKey(3));

    expect(idle.closeCode).toBe(4000);
    expect(alive.closeCode).toBeNull();
    expect(alive.frames()).toContainEqual({ v: 1, t: "leave", seat: idle.peer().seat });
  });

  it("미입장 소켓은 10초 후 정리하고 프레임 폭주와 잘못된 버전은 종료한다", async () => {
    const pending = new RoomSocket();
    const state = new RoomState();
    state.sockets.push(pending);
    const { join, send } = createRoom(state);
    vi.advanceTimersByTime(10_000);
    expect(pending.closeCode).toBe(4009);
    const flooder = await join(clientKey(1));

    for (let index = 0; index < 41; index += 1) {
      await send(flooder, { v: 1, t: "move", ...flooder.peer() });
    }
    expect(flooder.closeCode).toBe(4008);
    const incompatible = await join(clientKey(2));
    await send(incompatible, { v: 2, t: "move", ...incompatible.peer() });
    expect(incompatible.closeCode).toBe(4002);
  });

  it("업그레이드 전에 IP 연결 수와 미입장 연결 수를 제한한다", async () => {
    const state = new RoomState();
    state.sockets = Array.from({ length: 10 }, () => new RoomSocket());
    const { room } = createRoom(state);
    const response = await room.fetch(
      new Request("https://worker.test/v1/space/ws", {
        headers: { Upgrade: "websocket", "X-Chat-IP-Guard-Key": "other-ip" },
      }),
    );

    expect(response.status).toBe(429);
    expect(state.sockets).toHaveLength(10);
  });

  it("입장 완료된 소켓도 같은 IP guard의 20개 연결 상한에 포함한다", async () => {
    const { room, join } = createRoom();

    for (let index = 0; index < 20; index += 1) {
      await join(clientKey(index));
    }
    const response = await room.fetch(
      new Request("https://worker.test/v1/space/ws", {
        headers: { Upgrade: "websocket", "X-Chat-IP-Guard-Key": "test-ip" },
      }),
    );

    expect(response.status).toBe(429);
  });

  it("say 중복 방지는 wake 후에도 유지하고 attachment에는 최근 메타데이터만 남긴다", async () => {
    const { state, join, send } = createRoom();
    const sender = await join(clientKey(1));
    const body = "이 말풍선 본문은 보관하지 않아요";
    let lastRid = "";

    for (let index = 0; index < 36; index += 1) {
      lastRid = crypto.randomUUID();
      await send(sender, { v: 1, t: "say", rid: lastRid, body });
      vi.advanceTimersByTime(3000);
    }
    const attachment = sender.deserializeAttachment() as { recentSayReceipts: unknown[] };
    expect(attachment.recentSayReceipts).toHaveLength(32);
    expect(JSON.stringify(attachment)).not.toContain(body);
    expect(new TextEncoder().encode(JSON.stringify(attachment)).byteLength).toBeLessThan(8192);

    const restored = createRoom(state);
    const previousEcho = sender
      .frames()
      .filter((frame) => frame.t === "say")
      .at(-1);
    await restored.send(sender, { v: 1, t: "say", rid: lastRid, body });
    const repeatedEcho = sender
      .frames()
      .filter((frame) => frame.t === "say")
      .at(-1);

    expect(repeatedEcho).toEqual(previousEcho);
    expect(state.storage.sql.exec).not.toHaveBeenCalled();
  });

  it("닉네임을 바꾸면 모두에게 새 peer 를 보내고 좌표는 유지한다", async () => {
    const { join, send } = createRoom();
    const mover = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const before = mover.peer();

    await send(mover, { v: 1, t: "nick", rid: requestId, nickname: "새이름" });

    expect(mover.peer()).toMatchObject({ nickname: "새이름", x: before.x, z: before.z });
    // 좌표를 함께 담아야 수신 쪽이 위치를 되감지 않는다.
    expect(observer.frames()).toContainEqual({
      v: 1,
      t: "peer",
      peer: { ...before, nickname: "새이름" },
    });
  });

  it("닉네임은 10초에 한 번만 바꿀 수 있다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));

    await send(socket, { v: 1, t: "nick", rid: requestId, nickname: "첫번째" });
    await send(socket, { v: 1, t: "nick", rid: otherRequestId, nickname: "두번째" });

    expect(socket.peer().nickname).toBe("첫번째");
    expect(socket.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "RATE_NICK_INTERVAL", rid: otherRequestId }),
    );

    vi.advanceTimersByTime(10_000);
    await send(socket, { v: 1, t: "nick", rid: otherRequestId, nickname: "두번째" });
    expect(socket.peer().nickname).toBe("두번째");
  });

  it("쓸 수 없는 닉네임은 거절하되 연결은 유지한다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));

    // 8 grapheme 한도를 넘는다. 프레임 자체는 멀쩡하므로 정규화에서 걸린다.
    await send(socket, { v: 1, t: "nick", rid: requestId, nickname: "아주아주아주긴닉네임" });

    expect(socket.peer().nickname).toBe("참여자");
    expect(socket.closeCode).toBeNull();
    expect(socket.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "INVALID_NICKNAME", rid: requestId }),
    );
  });
});
