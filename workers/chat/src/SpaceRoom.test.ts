import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type BossSimulation,
  createBossSimulation,
} from "../../../src/entities/space/lib/bossSimulation";
import { resolveColorIndexFromClientKey } from "../../../src/entities/space/lib/clientKeyHash";
import { decodeSpaceSnapshot } from "../../../src/entities/space/lib/spaceSnapshot";
import { createSpawnPoint } from "../../../src/entities/space/lib/spawnPoint";
import {
  resolveAvatarCombat,
  SPACE_AVATAR_MODELS,
} from "../../../src/entities/space/model/avatarModel";
import { SPACE_BARISTA_SPOT } from "../../../src/entities/space/model/barista";
import {
  SPACE_BOSS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_PLAYER,
} from "../../../src/entities/space/model/boss";
import { SPACE_HALL_BGM } from "../../../src/entities/space/model/hallBgm";
import { resolveKickServerIntervalMs, SPACE_KICK } from "../../../src/entities/space/model/kick";
import {
  parseSpaceServerFrame,
  SPACE_PROTOCOL_VERSION,
  SPACE_SERVER_FRAME_MAX_BYTES,
  type SpacePeer,
  type SpaceServerFrame,
} from "../../../src/entities/space/model/spaceProtocol";
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
      v: SPACE_PROTOCOL_VERSION,
      joined: false,
      ipGuardKey,
      joinDeadlineAt: Date.now() + 10_000,
      lastActivityAt: Date.now(),
      lastMoveAt: Date.now(),
      movementBudget: 0.5,
      lastSayAt: null,
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

interface ChatHistoryRecord {
  seq: number;
  id: string;
  rid: string;
  seat: number;
  nickname: string;
  body: string;
  created_at: number;
}

/** SpaceRoom 이 쓰는 대화 기록 쿼리만 흉내 냄. 다른 쿼리가 오면 바로 실패시킴. */
class FakeChatHistorySql {
  rows: ChatHistoryRecord[] = [];
  sayLog: Array<{ ipGuardKey: string; createdAt: number }> = [];
  /** 대화 기록 쓰기만 셈. say_log 는 IP 제한용이라 따로 봄. */
  writeCount = 0;
  private nextSeq = 1;

  exec = vi.fn((query: string, ...bindings: unknown[]) => {
    const statement = query.trim();

    if (statement.startsWith("CREATE TABLE IF NOT EXISTS chat_messages")) {
      return { toArray: () => [] };
    }
    if (statement.startsWith("INSERT INTO chat_messages")) {
      const [id, rid, seat, nickname, body, createdAt] = bindings as [
        string,
        string,
        number,
        string,
        string,
        number,
      ];
      this.rows.push({ seq: this.nextSeq, id, rid, seat, nickname, body, created_at: createdAt });
      this.nextSeq += 1;
      this.writeCount += 1;
      return { toArray: () => [] };
    }
    if (statement.startsWith("DELETE FROM chat_messages")) {
      this.rows = this.rows.slice(-(bindings[0] as number));
      this.writeCount += 1;
      return { toArray: () => [] };
    }
    if (statement.startsWith("SELECT id, rid, seat, nickname, body, created_at")) {
      const latestRows = [...this.rows].reverse().slice(0, bindings[0] as number);
      return { toArray: () => latestRows };
    }
    if (statement.startsWith("CREATE TABLE IF NOT EXISTS say_log")) {
      return { toArray: () => [] };
    }
    if (statement.startsWith("SELECT COUNT(*) AS count FROM say_log")) {
      const [ipGuardKey, after] = bindings as [string, number];
      const count = this.sayLog.filter(
        (entry) => entry.ipGuardKey === ipGuardKey && entry.createdAt > after,
      ).length;
      return { toArray: () => [{ count }] };
    }
    if (statement.startsWith("DELETE FROM say_log")) {
      this.sayLog = this.sayLog.filter((entry) => entry.createdAt > (bindings[0] as number));
      return { toArray: () => [] };
    }
    if (statement.startsWith("INSERT INTO say_log")) {
      const [ipGuardKey, createdAt] = bindings as [string, number];
      this.sayLog.push({ ipGuardKey, createdAt });
      return { toArray: () => [] };
    }

    throw new Error(`Unexpected SQL: ${statement}`);
  });
}

class RoomState {
  sockets: RoomSocket[] = [];
  autoResponses = new Map<WebSocket, Date>();
  setWebSocketAutoResponse = vi.fn();
  private marketValues = new Map<string, unknown>();
  private alarmAt: number | null = null;
  storage = {
    sql: new FakeChatHistorySql(),
    get: vi.fn(async (key: string) => structuredClone(this.marketValues.get(key))),
    put: vi.fn(async (key: string, value: unknown) => {
      this.marketValues.set(key, structuredClone(value));
    }),
    getAlarm: vi.fn(async () => this.alarmAt),
    setAlarm: vi.fn(async (at: number) => {
      this.alarmAt = at;
    }),
    deleteAlarm: vi.fn(async () => {
      this.alarmAt = null;
    }),
  };

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
  const join = async (
    clientKey: string,
    nickname = "참여자",
    modelIndex = 0,
    ipGuardKey = "test-ip",
    features?: string[],
  ) => {
    const socket = new RoomSocket(ipGuardKey);
    state.sockets.push(socket);
    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "join",
      clientKey,
      nickname,
      modelIndex,
      ...(features ? { features } : {}),
    });
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
  it("한 사용자의 테스트를 같은 이벤트로 방 전체에 보내고 옛 클라이언트에는 보내지 않는다", async () => {
    const { join, send } = createRoom();
    const first = await join(clientKey(1), "첫째", 0, "ip-1", ["market-sync-v1"]);
    const second = await join(clientKey(2), "둘째", 0, "ip-2", ["market-sync-v1"]);
    const legacy = await join(clientKey(3), "이전버전", 0, "ip-3", ["kick"]);
    await send(first, { v: SPACE_PROTOCOL_VERSION, t: "celebrate" });
    const firstEvent = first.frames().find((frame) => frame.t === "celebrate");
    expect(firstEvent).toBeDefined();
    expect(second.frames().find((frame) => frame.t === "celebrate")).toEqual(firstEvent);
    expect(legacy.frames().some((frame) => frame.t === "celebrate")).toBe(false);
    await send(second, { v: SPACE_PROTOCOL_VERSION, t: "celebrate" });
    expect(second.frames().at(-1)).toMatchObject({ t: "error", code: "CELEBRATION_COOLDOWN" });
    await send(first, { v: SPACE_PROTOCOL_VERSION, t: "clock", sentAt: 123.5 });
    expect(first.frames().at(-1)).toMatchObject({
      t: "clock",
      sentAt: 123.5,
      serverAt: Date.now(),
    });
  });

  it("서버가 50석을 배정하고 51번째 입장은 full로 종료한다", async () => {
    const { join, state } = createRoom();
    const seats = new Set<number>();

    for (let index = 0; index < 50; index += 1) {
      const socket = await join(clientKey(index));
      seats.add(socket.peer().seat);
    }
    const overflow = await join(clientKey(50));

    expect(seats.size).toBe(50);
    expect(overflow.frames()).toContainEqual({ v: SPACE_PROTOCOL_VERSION, t: "full" });
    expect(overflow.closeCode).toBe(4003);
    expect(state.storage.sql.writeCount).toBe(0);
  });

  it("스폰 좌표와 색을 clientKey 로 내려 클라이언트 예측과 일치시킨다", async () => {
    const { join } = createRoom();
    const socket = await join(clientKey(7));
    const welcome = socket.frames().find((frame) => frame.t === "welcome");

    // 클라이언트는 비밀키를 몰라서 stableActorKey 로 파생하면 예측 못 함.
    // 두 값이 어긋나면 입장 직후 아바타가 순간이동하고 색이 바뀜.
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
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      x: original.x + 0.5,
      // 광장 높이에서 출발함. 0 으로 두면 5 m 수직 순간이동이라 거절됨.
      y: original.y,
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

    expect(observer.frames()).toContainEqual({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat });
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

    expect(observer.frames()).toContainEqual({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat });
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
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self: observer.peer(),
      peers: [remaining.peer()],
      features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1", "hall-bgm-v1"],
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
    await send(failed, {
      v: SPACE_PROTOCOL_VERSION,
      t: "join",
      clientKey: clientKey(2),
      nickname: "참여자",
      modelIndex: 0,
    });

    expect(observer.frames().filter((frame) => frame.t === "peer")).toHaveLength(0);
    expect(observer.frames()).toContainEqual({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat: 1 });
  });

  it("변경 좌석만 100ms에 한 번 인코딩하고 움직임이 없으면 타이머·전송이 없다", async () => {
    const { join, send } = createRoom();
    const first = await join(clientKey(1));
    const second = await join(clientKey(2));
    first.sent = [];
    second.sent = [];
    vi.advanceTimersByTime(100);
    await send(first, {
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      ...first.peer(),
      x: first.peer().x + 0.4,
    });
    await send(second, {
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      ...second.peer(),
      z: second.peer().z + 0.4,
    });
    vi.advanceTimersByTime(99);
    expect(first.sent).toHaveLength(0);
    vi.advanceTimersByTime(1);

    const firstSnapshot = first.sent[0] as ArrayBuffer;
    expect(decodeSpaceSnapshot(firstSnapshot)?.players.map((player) => player.seat)).toEqual([
      0, 1,
    ]);
    expect(second.sent[0]).toBe(firstSnapshot);
    // 멈춘 뒤 빈 꼬리 틱 2개를 같은 박자로 더 보내고 끝냄.
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);
    const trailingSnapshots = first.sent
      .slice(1)
      .map((payload) => decodeSpaceSnapshot(payload as ArrayBuffer));
    const firstTimestamp = decodeSpaceSnapshot(firstSnapshot)?.timestamp ?? 0;
    expect(trailingSnapshots.map((snapshot) => snapshot?.players.length)).toEqual([0, 0]);
    expect(trailingSnapshots.map((snapshot) => snapshot?.timestamp)).toEqual([
      firstTimestamp + 100,
      firstTimestamp + 200,
    ]);
    vi.advanceTimersByTime(100);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(first.sent).toHaveLength(3);
  });

  it("붙어 도착한 정상 이동도 버리지 않아 마지막 위치가 남음", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));
    vi.advanceTimersByTime(170);
    const original = socket.peer();
    await send(socket, { v: SPACE_PROTOCOL_VERSION, t: "move", ...original, x: original.x + 0.8 });
    vi.advanceTimersByTime(30);
    await send(socket, { v: SPACE_PROTOCOL_VERSION, t: "move", ...original, x: original.x + 1.6 });

    expect(socket.peer().x).toBeCloseTo(original.x + 1.6);
    expect(socket.frames().some((frame) => frame.t === "error")).toBe(false);
  });

  it("계속 움직이면 이동 도착 시점과 무관하게 100ms 박자를 지킴", async () => {
    const { join, send } = createRoom();
    const first = await join(clientKey(1));
    first.sent = [];
    vi.advanceTimersByTime(100);
    const timestamps: number[] = [];

    for (let step = 1; step <= 5; step += 1) {
      await send(first, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        ...first.peer(),
        x: first.peer().x + 0.3,
      });
      // 이동이 틱 사이 아무 때나 도착해도 다음 틱은 밀리지 않음.
      vi.advanceTimersByTime(step % 2 === 0 ? 100 : 60);
      vi.advanceTimersByTime(step % 2 === 0 ? 0 : 40);
    }
    for (const payload of first.sent) {
      const snapshot = decodeSpaceSnapshot(payload as ArrayBuffer);
      if (snapshot) {
        timestamps.push(snapshot.timestamp);
      }
    }
    expect(timestamps.length).toBeGreaterThanOrEqual(5);
    const gaps = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
    expect(gaps.every((gap) => gap === 100)).toBe(true);
  });

  it("순간이동은 거절해 서버 위치로 보정하고 긴 백그라운드 간격의 정상 이동은 허용한다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));
    const original = socket.peer();
    vi.advanceTimersByTime(100);
    await send(socket, { v: SPACE_PROTOCOL_VERSION, t: "move", ...original, x: original.x + 5 });

    expect(socket.peer().x).toBe(original.x);
    expect(socket.frames()).toContainEqual({
      v: SPACE_PROTOCOL_VERSION,
      t: "peer",
      peer: original,
    });
    vi.advanceTimersByTime(15_000);
    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      ...original,
      x: SPACE_BOUNDS.maxX,
      z: SPACE_BOUNDS.minZ,
    });
    expect(socket.peer()).toMatchObject({ x: SPACE_BOUNDS.maxX, z: SPACE_BOUNDS.minZ });
  });

  it("attachment에서 재구성한 roster는 원래 좌석을 유지하고 SQL에 쓰지 않는다", async () => {
    const { join, state } = createRoom();
    const first = await join(clientKey(1));
    const restored = createRoom(state);
    const second = await restored.join(clientKey(2));
    const welcome = second.frames().find((frame) => frame.t === "welcome");

    expect(welcome).toMatchObject({ peers: [first.peer()] });
    expect(state.setWebSocketAutoResponse).toHaveBeenCalledTimes(2);
    expect(state.storage.sql.writeCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("재전송 rid는 sender에만 같은 ID를 echo하며 1초 쿨다운과 본문 재사용을 검증한다", async () => {
    const { join, send } = createRoom();
    const sender = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const rid = crypto.randomUUID();
    const frame = { v: SPACE_PROTOCOL_VERSION, t: "say", rid, body: "함께 지켜봐요" };
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
    vi.advanceTimersByTime(999);
    const earlyRid = crypto.randomUUID();
    await send(sender, { ...frame, rid: earlyRid });
    expect(sender.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "RATE_SAY_INTERVAL", rid: earlyRid }),
    );
    expect(observer.frames().filter((item) => item.t === "say")).toHaveLength(1);
    vi.advanceTimersByTime(1);
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
    await send(sender, {
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      rid: crypto.randomUUID(),
      body: `${body}👨‍👩‍👧‍👦`,
    });
    expect(sender.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "BODY_TOO_LONG" }),
    );
    expect(sender.frames().some((frame) => frame.t === "say")).toBe(false);

    await send(sender, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: crypto.randomUUID(), body });
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
    expect(alive.frames()).toContainEqual({
      v: SPACE_PROTOCOL_VERSION,
      t: "leave",
      seat: idle.peer().seat,
    });
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
      await send(flooder, { v: SPACE_PROTOCOL_VERSION, t: "move", ...flooder.peer() });
    }
    expect(flooder.closeCode).toBe(4008);
    const incompatible = await join(clientKey(2));
    // 벙커 시절 버전. `y` 의미가 달라 그대로 받으면 안 됨.
    await send(incompatible, { v: 1, t: "move", ...incompatible.peer() });
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

  it("입장 없이 현재 좌석 수만 돌려준다", async () => {
    const { room, join } = createRoom();
    const readCount = async () =>
      (await room.fetch(new Request("https://space-room/v1/space/presence"))).json();

    expect(await readCount()).toEqual({ count: 0 });
    await join(clientKey(1));
    await join(clientKey(2), "둘째", 0, "other-ip");
    expect(await readCount()).toEqual({ count: 2 });
  });

  it("입장 완료된 소켓도 같은 IP guard의 2개 연결 상한에 포함한다", async () => {
    const { room, join } = createRoom();
    await join(clientKey(1));
    await join(clientKey(2));
    const response = await room.fetch(
      new Request("https://worker.test/v1/space/ws", {
        headers: { Upgrade: "websocket", "X-Chat-IP-Guard-Key": "test-ip" },
      }),
    );

    expect(response.status).toBe(429);
  });

  it("say 중복 방지 기록은 메모리에만 두고 attachment에는 싣지 않는다", async () => {
    const { state, join, send } = createRoom();
    const sender = await join(clientKey(1));
    const body = "이 말풍선 본문은 보관하지 않아요";
    let lastRid = "";

    for (let index = 0; index < 36; index += 1) {
      lastRid = crypto.randomUUID();
      await send(sender, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: lastRid, body });
      vi.advanceTimersByTime(5000);
    }
    const attachment = sender.deserializeAttachment();
    // 말을 아무리 해도 소켓 상태는 그대로임. 이동할 때마다 같이 저장되는 값이라 커지면 안 됨.
    expect(attachment).not.toHaveProperty("recentSayReceipts");
    expect(JSON.stringify(attachment)).not.toContain(body);
    expect(JSON.stringify(attachment)).not.toContain(lastRid);

    const sayFrames = () => sender.frames().filter((frame) => frame.t === "say");
    const previousEcho = sayFrames().at(-1);
    const writeCountBeforeReplay = state.storage.sql.writeCount;
    await send(sender, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: lastRid, body });

    expect(sayFrames().at(-1)).toEqual(previousEcho);
    // 재전송은 기록에 다시 안 씀.
    expect(state.storage.sql.writeCount).toBe(writeCountBeforeReplay);

    // 하이버네이션 뒤에는 기록이 비워져 같은 요청 번호도 새 메시지로 받음.
    const restored = createRoom(state);
    await restored.send(sender, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: lastRid, body });

    expect(sayFrames().at(-1)).not.toEqual(previousEcho);
    expect(state.storage.sql.writeCount).toBeGreaterThan(writeCountBeforeReplay);
  });

  it("탭을 바꿔 들어와도 say 중복 방지 기록을 이어 간다", async () => {
    const { join, send } = createRoom();
    const previous = await join(clientKey(1));
    const frame = {
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      rid: crypto.randomUUID(),
      body: "한 번만 보여요",
    };

    await send(previous, frame);
    const replacement = await join(clientKey(1));
    await send(replacement, frame);

    const echoes = [...previous.frames(), ...replacement.frames()].filter(
      (item) => item.t === "say",
    );

    expect(echoes).toHaveLength(2);
    expect(echoes[0]).toEqual(echoes[1]);
  });

  it("소켓 상태는 처음 한 번만 풀어 읽고 그 뒤로는 메모리 사본을 쓴다", async () => {
    const { state, join, send } = createRoom();
    const features = ["kick", "boss-v1"];
    const mover = await join(clientKey(1), "참여자", 0, "test-ip", features);
    const observer = await join(clientKey(2), "참여자", 0, "test-ip", features);
    const start = mover.peer();
    const spies = [mover, observer].map((socket) => vi.spyOn(socket, "deserializeAttachment"));

    await send(mover, { v: SPACE_PROTOCOL_VERSION, t: "move", ...start, x: start.x + 0.1 });
    await send(mover, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
    // 공격은 받는 사람마다, 틱은 좌석마다 상태를 읽음. 그래도 방은 한 번도 안 풀어 읽음.
    vi.advanceTimersByTime(300);
    expect(observer.frames().some((frame) => frame.t === "kick")).toBe(true);
    expect(spies[0]).not.toHaveBeenCalled();
    expect(spies[1]).not.toHaveBeenCalled();

    // 깨어난 방은 소켓에 저장된 값에서 다시 시작함. 이동한 자리가 그대로 남아 있어야 함.
    const movedX = mover.peer().x;

    expect(movedX).toBeCloseTo(start.x + 0.1);
    const restored = createRoom(state);
    const arriving = await restored.join(clientKey(3));
    const welcome = arriving.frames().find((frame) => frame.t === "welcome");

    expect(
      welcome?.t === "welcome" && welcome.peers.find((peer) => peer.seat === mover.peer().seat)?.x,
    ).toBe(movedX);
  });

  it("IP 하나는 연결을 나눠도 1분에 12개까지만 보내고, 다른 IP 는 영향받지 않는다", async () => {
    const { join, send } = createRoom();
    const first = await join(clientKey(1), "첫째", 0, "shared-ip");
    const second = await join(clientKey(2), "둘째", 0, "shared-ip");
    const other = await join(clientKey(3), "다른곳", 0, "other-ip");
    const say = (socket: RoomSocket, body: string) =>
      send(socket, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: crypto.randomUUID(), body });
    const errorCodes = (socket: RoomSocket) =>
      socket.frames().flatMap((frame) => (frame.t === "error" ? [frame.code] : []));

    // 두 연결이 번갈아 6개씩, 3초 간격을 지키며 12개를 채움.
    for (let index = 0; index < 6; index += 1) {
      await say(first, `첫째 ${index}`);
      await say(second, `둘째 ${index}`);
      vi.advanceTimersByTime(3000);
    }
    await say(first, "열세 번째");
    await say(other, "다른 IP");

    expect(errorCodes(first)).toContain("RATE_SAY_MINUTE");
    expect(errorCodes(other)).not.toContain("RATE_SAY_MINUTE");

    // 가장 오래된 메시지가 1분 창을 벗어나면 다시 보낼 수 있음.
    vi.advanceTimersByTime(60_000);
    const errorCountBefore = errorCodes(first).length;
    await say(first, "다시 보냄");
    expect(errorCodes(first)).toHaveLength(errorCountBefore);
  });

  it("기록이 커도 welcome 은 클라이언트 한도 안에 들도록 오래된 메시지부터 뺀다", async () => {
    const { join, send } = createRoom();
    const sender = await join(clientKey(1));
    // 글자 하나에 결합 문자 30개를 붙여 100자여도 6KB 가 넘는 본문을 만듦.
    const combiningMarks = Array.from({ length: 30 }, (_, index) =>
      String.fromCodePoint(0x0300 + index),
    ).join("");
    const createHeavyBody = (seed: number): string =>
      Array.from(
        { length: 100 },
        (_, index) => `${String.fromCharCode(97 + ((seed + index) % 26))}${combiningMarks}`,
      ).join("");
    let lastBody = "";

    for (let index = 0; index < 50; index += 1) {
      lastBody = createHeavyBody(index);
      await send(sender, {
        v: SPACE_PROTOCOL_VERSION,
        t: "say",
        rid: crypto.randomUUID(),
        body: lastBody,
      });
      vi.advanceTimersByTime(5000);
    }
    const newcomer = await join(clientKey(2));
    const rawWelcome = newcomer.sent.find(
      (payload): payload is string =>
        typeof payload === "string" && JSON.parse(payload).t === "welcome",
    );
    const welcome = rawWelcome ? parseSpaceServerFrame(rawWelcome) : null;
    const messages = welcome?.t === "welcome" ? (welcome.messages ?? []) : [];

    expect(new TextEncoder().encode(rawWelcome).byteLength).toBeLessThanOrEqual(
      SPACE_SERVER_FRAME_MAX_BYTES,
    );
    expect(welcome?.t).toBe("welcome");
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.length).toBeLessThan(50);
    expect(messages.at(-1)?.body.normalize("NFC")).toBe(lastBody.normalize("NFC"));
  });

  it("입장하면 최근 대화 50개만 오래된 순으로 welcome 에 담아 받는다", async () => {
    const { join, send } = createRoom();
    const sender = await join(clientKey(1));

    for (let index = 0; index < 55; index += 1) {
      await send(sender, {
        v: SPACE_PROTOCOL_VERSION,
        t: "say",
        rid: crypto.randomUUID(),
        body: `메시지 ${index}`,
      });
      vi.advanceTimersByTime(5000);
    }
    const newcomer = await join(clientKey(2));
    const welcome = newcomer.frames().find((frame) => frame.t === "welcome");
    const bodies = welcome?.t === "welcome" ? (welcome.messages ?? []).map(({ body }) => body) : [];

    expect(bodies).toHaveLength(50);
    expect(bodies[0]).toBe("메시지 5");
    expect(bodies.at(-1)).toBe("메시지 54");
  });

  it("하이버네이션으로 메모리가 비워져도 기록을 SQL 에서 다시 읽는다", async () => {
    const { state, join, send } = createRoom();
    const sender = await join(clientKey(1));

    await send(sender, { v: SPACE_PROTOCOL_VERSION, t: "say", rid: requestId, body: "첫 말" });
    vi.advanceTimersByTime(3000);
    await send(sender, {
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      rid: otherRequestId,
      body: "둘째 말",
    });

    const restored = createRoom(state);
    const newcomer = await restored.join(clientKey(2));
    const welcome = newcomer.frames().find((frame) => frame.t === "welcome");

    expect(welcome).toMatchObject({
      messages: [
        { rid: requestId, body: "첫 말", seat: sender.peer().seat },
        { rid: otherRequestId, body: "둘째 말", seat: sender.peer().seat },
      ],
    });
  });

  it("닉네임을 바꾸면 모두에게 새 peer 를 보내고 좌표는 유지한다", async () => {
    const { join, send } = createRoom();
    const mover = await join(clientKey(1));
    const observer = await join(clientKey(2));
    const before = mover.peer();

    await send(mover, { v: SPACE_PROTOCOL_VERSION, t: "nick", rid: requestId, nickname: "새이름" });

    expect(mover.peer()).toMatchObject({ nickname: "새이름", x: before.x, z: before.z });
    // 좌표를 함께 담아야 수신 쪽이 위치를 되감지 않음.
    expect(observer.frames()).toContainEqual({
      v: SPACE_PROTOCOL_VERSION,
      t: "peer",
      peer: { ...before, nickname: "새이름" },
    });
  });

  it("닉네임은 10초에 한 번만 바꿀 수 있다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));

    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "nick",
      rid: requestId,
      nickname: "첫번째",
    });
    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "nick",
      rid: otherRequestId,
      nickname: "두번째",
    });

    expect(socket.peer().nickname).toBe("첫번째");
    expect(socket.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "RATE_NICK_INTERVAL", rid: otherRequestId }),
    );

    vi.advanceTimersByTime(10_000);
    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "nick",
      rid: otherRequestId,
      nickname: "두번째",
    });
    expect(socket.peer().nickname).toBe("두번째");
  });

  it("쓸 수 없는 닉네임은 거절하되 연결은 유지한다", async () => {
    const { join, send } = createRoom();
    const socket = await join(clientKey(1));

    // 8 grapheme 한도를 넘음. 프레임은 멀쩡해서 정규화에서 걸림.
    await send(socket, {
      v: SPACE_PROTOCOL_VERSION,
      t: "nick",
      rid: requestId,
      nickname: "아주아주아주긴닉네임",
    });

    expect(socket.peer().nickname).toBe("참여자");
    expect(socket.closeCode).toBeNull();
    expect(socket.frames()).toContainEqual(
      expect.objectContaining({ t: "error", code: "INVALID_NICKNAME", rid: requestId }),
    );
  });

  describe("발차기", () => {
    /** 둘 다 발차기를 아는 클라이언트로 입장시키고 두 번째를 첫 번째 옆(+x 쪽)에 세움. */
    const setUpPair = async (gap = 1) => {
      const room = createRoom();
      const kicker = await room.join(clientKey(1), "찬사람", 0, "ip-1", ["kick"]);
      const target = await room.join(clientKey(2), "맞은사람", 0, "ip-2", ["kick"]);
      vi.advanceTimersByTime(3000);
      const origin = kicker.peer();
      await room.send(target, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        ...target.peer(),
        x: origin.x + gap,
        y: origin.y,
        z: origin.z,
      });
      kicker.sent = [];
      target.sent = [];
      return { ...room, kicker, target };
    };
    const kickFrames = (socket: RoomSocket) =>
      socket.frames().filter((frame) => frame.t === "kick");

    it("입장 응답에 지원 기능을 실어 보냄", async () => {
      const { join } = createRoom();
      const socket = await join(clientKey(1), "참여자", 0, "test-ip", ["kick"]);

      expect(socket.frames().find((frame) => frame.t === "welcome")).toMatchObject({
        features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1", "hall-bgm-v1"],
      });
    });

    it("유저끼리는 맞지 않음. 옛 클라이언트가 대상을 실어 보내도 연출만 알리고 이동 예산도 그대로임", async () => {
      const { send, kicker, target } = await setUpPair(1);
      const budgetBefore = (target.deserializeAttachment() as { movementBudget: number })
        .movementBudget;
      const yaw = kicker.peer().yaw;

      await send(kicker, { v: SPACE_PROTOCOL_VERSION, t: "kick", target: target.peer().seat });

      for (const socket of [kicker, target]) {
        const [frame] = kickFrames(socket);
        expect(frame).not.toHaveProperty("to");
        expect(frame).toMatchObject({ from: kicker.peer().seat });
        if (frame?.t === "kick") {
          expect(frame.dirX).toBeCloseTo(-Math.sin(yaw));
          expect(frame.dirZ).toBeCloseTo(-Math.cos(yaw));
        }
      }
      expect((target.deserializeAttachment() as { movementBudget: number }).movementBudget).toBe(
        budgetBefore,
      );
    });

    it.each([
      -2000, -200, 5000,
    ])("공격 시각 오차 %dms를 제한하고 동일 공격은 쿨다운 후에도 재적용하지 않음", async (clockDelta) => {
      const { send, kicker, target } = await setUpPair(1);
      const now = Date.now();
      const request = {
        v: SPACE_PROTOCOL_VERSION,
        t: "kick",
        id: requestId,
        startedAt: now + clockDelta,
      };
      await send(kicker, request);
      const [event] = kickFrames(target);
      expect(event).toMatchObject({
        id: requestId,
        startedAt: Math.max(now - SPACE_KICK.maximumBackdateMs, Math.min(now, now + clockDelta)),
        serverAt: now,
      });
      expect(parseSpaceServerFrame(JSON.stringify(event))).toEqual(event);
      vi.advanceTimersByTime(SPACE_KICK.cooldownMs);
      await send(kicker, request);
      expect(kickFrames(target)).toHaveLength(1);
    });

    it("옛 클라이언트의 공격도 서버에서 식별자와 시각을 붙여 전달함", async () => {
      const { send, kicker, target } = await setUpPair(1);
      await send(kicker, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      const [event] = kickFrames(target);
      expect(event).toMatchObject({
        id: expect.any(String),
        startedAt: Date.now(),
        serverAt: Date.now(),
      });
      expect(parseSpaceServerFrame(JSON.stringify(event))).toEqual(event);
    });

    it("멀리 있는 사람에게도 동작은 알림", async () => {
      const { send, kicker, target } = await setUpPair(4);

      await send(kicker, { v: SPACE_PROTOCOL_VERSION, t: "kick" });

      expect(kickFrames(target)).toEqual([expect.objectContaining({ from: kicker.peer().seat })]);
    });

    it("쿨다운 안에 다시 찬 건 버리되 도착 지연을 감안해 0.5초 일찍부터 받음", async () => {
      const { send, kicker, target } = await setUpPair(1);
      const kick = { v: SPACE_PROTOCOL_VERSION, t: "kick" };
      // 쿨다운은 캐릭터마다 다름. 테스트 유저는 기본 모델(0번)임.
      const { cooldownMs } = resolveAvatarCombat(kicker.peer().modelIndex);
      const serverCooldown = resolveKickServerIntervalMs(cooldownMs);
      expect(serverCooldown).toBe(cooldownMs - SPACE_KICK.serverCooldownToleranceMs);

      await send(kicker, kick);
      vi.advanceTimersByTime(serverCooldown - 1);
      await send(kicker, kick);
      expect(kickFrames(target)).toHaveLength(1);

      vi.advanceTimersByTime(1);
      await send(kicker, kick);
      expect(kickFrames(target)).toHaveLength(2);
    });

    it("발차기를 모르는 옛 클라이언트에는 보내지 않음", async () => {
      const { join, send } = createRoom();
      const kicker = await join(clientKey(1), "찬사람", 0, "ip-1", ["kick"]);
      const oldClient = await join(clientKey(2), "옛탭", 0, "ip-2");
      oldClient.sent = [];

      await send(kicker, { v: SPACE_PROTOCOL_VERSION, t: "kick" });

      expect(kickFrames(kicker)).toHaveLength(1);
      expect(kickFrames(oldClient)).toHaveLength(0);
      expect(oldClient.closeCode).toBeNull();
    });

    it("보는 방향으로 연출만 알림", async () => {
      const { send, kicker } = await setUpPair(1);
      const yaw = kicker.peer().yaw;

      await send(kicker, { v: SPACE_PROTOCOL_VERSION, t: "kick" });

      const [frame] = kickFrames(kicker);
      expect(frame).not.toHaveProperty("to");
      expect(frame).toMatchObject({ from: kicker.peer().seat });
      if (frame?.t === "kick") {
        expect(frame.dirX).toBeCloseTo(-Math.sin(yaw));
        expect(frame.dirZ).toBeCloseTo(-Math.cos(yaw));
      }
    });
  });

  describe("홀 배경음악", () => {
    const HALL_BGM_FEATURES = ["hall-bgm-v1"];
    const hallBgmFrames = (socket: RoomSocket) =>
      socket.frames().filter((frame) => frame.t === "hall-bgm");
    /** 스폰 자리에서 바리스타 앞까지 걸어갈 시간을 흘려보낸 뒤 그 앞으로 옮김. */
    const walkToBarista = async (
      send: ReturnType<typeof createRoom>["send"],
      socket: RoomSocket,
    ) => {
      vi.advanceTimersByTime(8_000);
      await send(socket, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: SPACE_BARISTA_SPOT.x,
        y: SPACE_BARISTA_SPOT.y,
        z: SPACE_BARISTA_SPOT.z - 3,
        yaw: 0,
        isRunning: false,
      });
    };

    it("곡을 바꾸면 그 기능을 아는 사람 모두에게 알리고 저장한다", async () => {
      const { state, send, join } = createRoom();
      const changer = await join(clientKey(1), "디제이", 0, "ip-1", HALL_BGM_FEATURES);
      const listener = await join(clientKey(2), "손님", 0, "ip-2", HALL_BGM_FEATURES);
      const oldClient = await join(clientKey(3), "옛탭", 0, "ip-3");

      await walkToBarista(send, changer);
      const now = Date.now();

      await send(changer, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "surge" });

      const expected = {
        track: "surge",
        startsAt: now + SPACE_HALL_BGM.leadMs,
        changedAt: now,
        byNickname: "디제이",
      };

      expect(hallBgmFrames(changer)).toMatchObject([{ state: expected }]);
      expect(hallBgmFrames(listener)).toMatchObject([{ state: expected }]);
      // 모르는 클라이언트에는 안 보냄.
      expect(hallBgmFrames(oldClient)).toHaveLength(0);
      expect(state.storage.put).toHaveBeenCalledWith("space-hall-bgm-v1", expected);
    });

    it("방 전체 쿨다운 안에는 누구의 요청이든 거절하고, 지나면 다시 받는다", async () => {
      const { send, join } = createRoom();
      const first = await join(clientKey(1), "디제이", 0, "ip-1", HALL_BGM_FEATURES);
      const second = await join(clientKey(2), "손님", 0, "ip-2", HALL_BGM_FEATURES);

      await walkToBarista(send, first);
      await send(second, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: SPACE_BARISTA_SPOT.x + 1,
        y: SPACE_BARISTA_SPOT.y,
        z: SPACE_BARISTA_SPOT.z - 3,
        yaw: 0,
        isRunning: false,
      });
      await send(first, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "surge" });
      vi.advanceTimersByTime(SPACE_HALL_BGM.changeCooldownMs - 1_000);
      await send(second, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "base" });

      expect(hallBgmFrames(second)).toHaveLength(1);
      expect(second.frames().at(-1)).toMatchObject({ t: "error", code: "HALL_BGM_COOLDOWN" });

      vi.advanceTimersByTime(1_000);
      await send(second, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "base" });

      expect(hallBgmFrames(second)).toHaveLength(2);
      expect(hallBgmFrames(second)[1]).toMatchObject({
        state: { track: "base", byNickname: "손님" },
      });
    });

    it("바리스타에게서 떨어진 자리에서 보낸 요청은 거절한다", async () => {
      const { state, send, join } = createRoom();
      const changer = await join(clientKey(1), "디제이", 0, "ip-1", HALL_BGM_FEATURES);

      vi.advanceTimersByTime(8_000);
      await send(changer, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: SPACE_BARISTA_SPOT.x,
        y: SPACE_BARISTA_SPOT.y,
        z: SPACE_BARISTA_SPOT.z - SPACE_BARISTA_SPOT.leaveRadius - 1,
        yaw: 0,
        isRunning: false,
      });
      await send(changer, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "surge" });

      expect(hallBgmFrames(changer)).toHaveLength(0);
      expect(changer.frames().at(-1)).toMatchObject({ t: "error", code: "HALL_BGM_TOO_FAR" });
      expect(state.storage.put).not.toHaveBeenCalledWith("space-hall-bgm-v1", expect.anything());
    });

    it("뒤에 들어온 사람은 입장 응답으로 지금 곡을 받는다", async () => {
      const { send, join } = createRoom();
      const changer = await join(clientKey(1), "디제이", 0, "ip-1", HALL_BGM_FEATURES);

      expect(changer.frames().find((frame) => frame.t === "welcome")).not.toHaveProperty("hallBgm");

      await walkToBarista(send, changer);
      await send(changer, { v: SPACE_PROTOCOL_VERSION, t: "hall-bgm", track: "surge" });
      const late = await join(clientKey(2), "손님", 0, "ip-2", HALL_BGM_FEATURES);
      const oldClient = await join(clientKey(3), "옛탭", 0, "ip-3");

      expect(late.frames().find((frame) => frame.t === "welcome")).toMatchObject({
        hallBgm: { track: "surge", byNickname: "디제이" },
      });
      expect(oldClient.frames().find((frame) => frame.t === "welcome")).not.toHaveProperty(
        "hallBgm",
      );
    });
  });

  describe("레이드 보스", () => {
    const BOSS_FEATURES = ["kick", "boss-v1"];

    // 피해가 기준값으로 나오게 난수를 가운데로 고정함. 흔들림은 따로 봄.
    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });
    /** 테스트 유저가 쓰는 기본 모델(0번)의 공격 성격. */
    const DEFAULT_COMBAT = resolveAvatarCombat(0);
    /** 무기가 닿기까지 가장 오래 걸리는 모델. */
    const SLOWEST_MODEL_INDEX = SPACE_AVATAR_MODELS.reduce(
      (slowest, model, index) =>
        model.combat.impactSeconds > SPACE_AVATAR_MODELS[slowest].combat.impactSeconds
          ? index
          : slowest,
      0,
    );
    const { arena } = SPACE_BOSS;
    const framesOf = <Kind extends SpaceServerFrame["t"]>(socket: RoomSocket, kind: Kind) =>
      socket.frames().filter((frame) => frame.t === kind) as Extract<
        SpaceServerFrame,
        { t: Kind }
      >[];
    const attachmentOf = (socket: RoomSocket) =>
      socket.deserializeAttachment() as { health?: number; deadUntil?: number };

    /** 홀에서 안뜰까지 걸어갈 시간을 흘려보낸 뒤 아레나 중심 기준 자리로 옮김. */
    const moveIntoArena = async (
      send: ReturnType<typeof createRoom>["send"],
      socket: RoomSocket,
      offsetX: number,
      offsetZ: number,
      yaw = 0,
    ) => {
      vi.advanceTimersByTime(8_000);
      await send(socket, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: arena.centerX + offsetX,
        y: arena.floorY,
        z: arena.centerZ + offsetZ,
        yaw,
        isRunning: false,
      });
    };

    /** 휘두른 무기가 닿을 때까지 기다림. 서버는 그때 맞았는지 봄. */
    const waitForImpact = (modelIndex = 0) => {
      vi.advanceTimersByTime(resolveAvatarCombat(modelIndex).impactSeconds * 1000);
    };

    /** 자리 비움으로 빠지지 않게 1초마다 제자리에서 살짝 움직이며 시간을 보냄. */
    const stayActive = async (
      send: ReturnType<typeof createRoom>["send"],
      socket: RoomSocket,
      seconds: number,
      until?: () => boolean,
    ) => {
      for (let second = 0; second < seconds && !until?.(); second += 1) {
        const peer = socket.peer();

        vi.advanceTimersByTime(1_000);
        await send(socket, {
          v: SPACE_PROTOCOL_VERSION,
          t: "move",
          x: peer.x,
          y: peer.y,
          z: peer.z + (second % 2 === 0 ? 0.02 : -0.02),
          yaw: peer.yaw,
          isRunning: false,
        });
      }
    };

    it("입장 응답에 마지막 처치 시각과 내 체력을 싣고, 보스를 모르는 클라이언트에는 안 싣는다", async () => {
      const { join } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const oldClient = await join(clientKey(2), "옛탭", 0, "ip-2", ["kick"]);
      const [welcome] = framesOf(fighter, "welcome");

      expect(welcome.boss).toEqual({
        lastKilledAt: null,
        health: SPACE_BOSS_PLAYER.maximumHealth,
        serverAt: Date.now(),
      });
      expect(parseSpaceServerFrame(JSON.stringify(welcome))).toMatchObject({ boss: welcome.boss });
      expect(framesOf(oldClient, "welcome")[0]).not.toHaveProperty("boss");
    });

    it("홀에서만 움직이는 동안에는 보스 프레임도 추가 틱도 없다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const peer = fighter.peer();

      vi.advanceTimersByTime(1_000);
      await send(fighter, { ...peer, v: SPACE_PROTOCOL_VERSION, t: "move", x: peer.x + 0.5 });
      vi.advanceTimersByTime(5_000);

      expect(framesOf(fighter, "boss")).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("아레나에 들어오면 매 틱 보스 상태를 보내고 가만히 있어도 틱이 이어진다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const oldClient = await join(clientKey(2), "옛탭", 0, "ip-2", ["kick"]);

      await moveIntoArena(send, fighter, -8, 0);
      vi.advanceTimersByTime(2_000);

      const bossFrames = framesOf(fighter, "boss");

      expect(bossFrames.length).toBeGreaterThanOrEqual(19);
      expect(bossFrames.at(-1)?.state.targetSeat).toBe(fighter.peer().seat);
      expect(bossFrames.at(-1)?.state.health).toBe(SPACE_BOSS_COMBAT.maximumHealth);
      for (const frame of bossFrames) {
        expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
      }
      expect(framesOf(oldClient, "boss")).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(1);
    });

    it("환경변수로 보스 체력을 1 로 두면 한 대에 쓰러진다", async () => {
      const state = new RoomState();
      const room = new SpaceRoom(state.asDurableState(), {
        ...workerEnv,
        SPACE_BOSS_MAXIMUM_HEALTH: "1",
      });
      const fighter = new RoomSocket("ip-1");
      const send = (frame: unknown) =>
        room.webSocketMessage(fighter.asWebSocket(), JSON.stringify(frame));

      state.sockets.push(fighter);
      await send({
        v: SPACE_PROTOCOL_VERSION,
        t: "join",
        clientKey: clientKey(1),
        nickname: "싸움꾼",
        modelIndex: 0,
        features: BOSS_FEATURES,
      });
      await moveIntoArena((_, frame) => send(frame), fighter, 2.5, 0, Math.PI / 2);
      await send({ v: SPACE_PROTOCOL_VERSION, t: "kick" });
      waitForImpact();

      expect(framesOf(fighter, "boss-hit")[0]).toMatchObject({ damage: 1, health: 0 });
      expect(framesOf(fighter, "boss-dead")).toHaveLength(1);
    });

    it("대상이 나가면 보스가 돌아가 쉬고 틱이 멈춘다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, fighter, -8, 0);
      vi.advanceTimersByTime(3_000);
      // 아레나 밖(안뜰 구석)으로 나감.
      await send(fighter, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: arena.centerX - 14,
        y: arena.floorY,
        z: arena.centerZ + 10,
        yaw: 0,
        isRunning: false,
      });
      vi.advanceTimersByTime(60_000);

      expect(framesOf(fighter, "boss").at(-1)?.state).toMatchObject({
        phase: "idle",
        targetSeat: null,
        health: SPACE_BOSS_COMBAT.maximumHealth,
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("보스 앞에 서 있으면 맞아서 체력이 깎이고, 0 이 되면 잠시 누워 있다가 홀로 옮겨진다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const observer = await join(clientKey(2), "구경꾼", 0, "ip-2", ["kick"]);

      // 보스가 처음 보는 방향(−X) 바로 앞.
      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 40, () => framesOf(fighter, "respawn").length > 0);

      const healths = framesOf(fighter, "hp").map((frame) => frame.health);
      const [respawn] = framesOf(fighter, "respawn");

      expect(healths[0]).toBe(
        SPACE_BOSS_PLAYER.maximumHealth - SPACE_BOSS_COMBAT.attackDamage.swipe,
      );
      expect(healths.at(-1)).toBe(0);
      expect(respawn).toBeDefined();
      expect(parseSpaceServerFrame(JSON.stringify(respawn))).toEqual(respawn);
      expect(respawn.reviveAt - respawn.serverAt).toBe(SPACE_BOSS_PLAYER.respawnDelayMs);
      // 아직 쓰러진 자리에 누워 있음. 남의 화면에서 쓰러지는 모습이 보이게 바로 안 옮김.
      expect(fighter.peer().x).toBeGreaterThan(SPACE_BOSS_PLAYER.hallMaximumX);
      expect(attachmentOf(fighter).health).toBe(SPACE_BOSS_PLAYER.maximumHealth);

      vi.advanceTimersByTime(SPACE_BOSS_PLAYER.respawnMoveDelayMs);

      // 홀 안 스폰 고리로 옮겨졌고, 보스를 모르는 구경꾼도 `peer` 로 그 자리를 받음.
      expect(fighter.peer()).toMatchObject({ x: respawn.x, y: respawn.y, z: respawn.z });
      expect(fighter.peer().x).toBeLessThan(SPACE_BOSS_PLAYER.hallMaximumX);
      expect(framesOf(observer, "peer").at(-1)?.peer).toMatchObject({
        seat: fighter.peer().seat,
        x: respawn.x,
        z: respawn.z,
      });
    });

    it("쓰러지면 그 사람의 누적 피해를 깎으라고 보스에 한 번 알린다", async () => {
      const { room, join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const { boss } = room as unknown as { boss: BossSimulation };
      const applyPlayerDeath = vi.spyOn(boss, "applyPlayerDeath");

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 40, () => framesOf(fighter, "respawn").length > 0);

      expect(framesOf(fighter, "respawn")).toHaveLength(1);
      expect(applyPlayerDeath).toHaveBeenCalledTimes(1);
      expect(applyPlayerDeath).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f]{16,}$/));
    });

    it("보스가 쉬러 들어가도 누운 사람은 제때 옮기고 나서 틱을 멈춘다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 40, () => framesOf(fighter, "respawn").length > 0);
      // 혼자 싸우다 쓰러졌으니 보스는 대상이 없어 돌아감. 그 뒤로 이동은 더 안 보냄.
      vi.advanceTimersByTime(60_000);

      expect(fighter.peer().x).toBeLessThan(SPACE_BOSS_PLAYER.hallMaximumX);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("누가 맞으면 보스를 아는 모두에게 알리고, 쓰러뜨린 공격은 따로 표시한다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const watcher = await join(clientKey(2), "구경꾼", 0, "ip-2", BOSS_FEATURES);
      const oldClient = await join(clientKey(3), "옛탭", 0, "ip-3", ["kick"]);

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 40, () => framesOf(fighter, "respawn").length > 0);

      const seen = framesOf(watcher, "player-hit");
      const fighterSeat = fighter.peer().seat;

      expect(seen.length).toBeGreaterThanOrEqual(2);
      expect(seen[0]).toMatchObject({
        seat: fighterSeat,
        by: "swipe",
        damage: SPACE_BOSS_COMBAT.attackDamage.swipe,
        isFatal: false,
      });
      expect(seen.at(-1)).toMatchObject({ seat: fighterSeat, isFatal: true });
      expect(seen.filter((frame) => frame.isFatal)).toHaveLength(1);
      for (const frame of seen) {
        expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
      }
      // 맞은 본인도 같은 알림을 받음. 본인은 피해 숫자를 띄우는 데만 씀.
      expect(framesOf(fighter, "player-hit")).toHaveLength(seen.length);
      expect(framesOf(oldClient, "player-hit")).toHaveLength(0);
    });

    it("쓰러져 있는 동안 온 이동·공격은 말없이 버리고, 끝나면 리스폰 자리에서 다시 받는다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 40, () => framesOf(fighter, "respawn").length > 0);

      const [respawn] = framesOf(fighter, "respawn");
      const fallen = fighter.peer();

      fighter.sent = [];
      // 사망 화면 중에도 클라이언트는 위치를 계속 보냄.
      await send(fighter, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: fallen.x + 1,
        y: fallen.y,
        z: fallen.z,
        yaw: 0,
        isRunning: false,
      });
      await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });

      expect(fighter.peer()).toEqual(fallen);
      expect(framesOf(fighter, "error")).toHaveLength(0);
      expect(framesOf(fighter, "kick")).toHaveLength(0);

      vi.advanceTimersByTime(SPACE_BOSS_PLAYER.respawnDelayMs);

      const respawned = fighter.peer();

      expect(respawned).toMatchObject({ x: respawn.x, z: respawn.z });
      await send(fighter, {
        ...respawned,
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: respawned.x + 1,
      });

      expect(fighter.peer().x).toBeCloseTo(respawned.x + 1);
      expect(framesOf(fighter, "error")).toHaveLength(0);
    });

    it("캐릭터마다 피해와 쿨다운이 다르다", async () => {
      const { join, send } = createRoom();
      const watcher = await join(clientKey(9), "구경꾼", 0, "ip-9", BOSS_FEATURES);
      const damages: number[] = [];

      for (const modelIndex of [0, 1, 2]) {
        const combat = resolveAvatarCombat(modelIndex);
        const fighter = await join(
          clientKey(modelIndex),
          "싸움꾼",
          modelIndex,
          `ip-${modelIndex}`,
          BOSS_FEATURES,
        );
        const countHits = () =>
          framesOf(watcher, "boss-hit").filter((frame) => frame.from === fighter.peer().seat)
            .length;

        await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact(modelIndex);
        expect(countHits()).toBe(1);

        // 서버가 받아 주는 간격 직전에는 버리고, 그 간격이 되면 받음.
        vi.advanceTimersByTime(
          resolveKickServerIntervalMs(combat.cooldownMs) - 1 - combat.impactSeconds * 1000,
        );
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        expect(countHits()).toBe(1);
        vi.advanceTimersByTime(1);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact(modelIndex);
        expect(countHits()).toBe(2);

        damages.push(framesOf(watcher, "boss-hit").at(-1)?.damage ?? 0);
        expect(damages.at(-1)).toBe(combat.kickDamage);
      }

      expect(new Set(damages).size).toBe(3);
    });

    it("보스를 모르는 옛 클라이언트는 쫓지도 때리지도 않고, 그쪽 공격도 보스에 안 들어간다", async () => {
      const { join, send } = createRoom();
      const oldClient = await join(clientKey(1), "옛탭", 0, "ip-1", ["kick"]);
      const watcher = await join(clientKey(2), "구경꾼", 0, "ip-2", BOSS_FEATURES);
      const spawn = oldClient.peer();

      await moveIntoArena(send, oldClient, 2.5, 0, Math.PI / 2);
      await send(oldClient, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      await stayActive(send, oldClient, 20);

      expect(framesOf(watcher, "boss")).toHaveLength(0);
      expect(framesOf(watcher, "boss-hit")).toHaveLength(0);
      expect(oldClient.peer().x).toBeGreaterThan(SPACE_BOSS_PLAYER.hallMaximumX);
      expect(oldClient.peer().x).not.toBe(spawn.x);
      expect(attachmentOf(oldClient).health).toBeUndefined();
    });

    it("닿는 거리에서 보스를 보고 휘두르면 피해를 주고, 멀면 연출만 나간다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const farAway = await join(clientKey(2), "홀사람", 0, "ip-2", BOSS_FEATURES);

      // 보스의 +X 쪽 2.5 m 에서 보스(−X)를 봄.
      await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
      await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      await send(farAway, { v: SPACE_PROTOCOL_VERSION, t: "kick" });

      // 누른 순간에는 안 들어감. 휘두른 무기가 닿을 때 들어감.
      expect(framesOf(farAway, "boss-hit")).toHaveLength(0);
      waitForImpact();

      const hits = framesOf(farAway, "boss-hit");

      expect(hits).toEqual([
        {
          v: SPACE_PROTOCOL_VERSION,
          t: "boss-hit",
          from: fighter.peer().seat,
          damage: DEFAULT_COMBAT.kickDamage,
          health: SPACE_BOSS_COMBAT.maximumHealth - DEFAULT_COMBAT.kickDamage,
          serverAt: Date.now(),
        },
      ]);
      expect(parseSpaceServerFrame(JSON.stringify(hits[0]))).toEqual(hits[0]);
      expect(framesOf(fighter, "kick")).toHaveLength(2);
    });

    it("쿨다운의 절반 간격으로 연타해도 길게 보면 쿨다운당 한 번만 받는다", async () => {
      const { join, send } = createRoom();
      const watcher = await join(clientKey(9), "구경꾼", 0, "ip-9", BOSS_FEATURES);

      for (const modelIndex of SPACE_AVATAR_MODELS.keys()) {
        const { cooldownMs } = resolveAvatarCombat(modelIndex);
        const fighter = await join(
          clientKey(modelIndex),
          "연타꾼",
          modelIndex,
          `ip-${modelIndex}`,
          BOSS_FEATURES,
        );
        const countSwings = () =>
          framesOf(watcher, "kick").filter((frame) => frame.from === fighter.peer().seat).length;
        // 초당 프레임 상한에 걸려 끊기지 않을 만큼만 빠르게 보냄.
        const spamIntervalMs = 50;
        const cooldownCount = 10;

        // 화면 버튼을 거치지 않고 50 ms 마다 요청을 직접 보내는 클라이언트.
        for (
          let elapsedMs = 0;
          elapsedMs < cooldownMs * cooldownCount;
          elapsedMs += spamIntervalMs
        ) {
          await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
          vi.advanceTimersByTime(spamIntervalMs);
        }

        // 처음 한 번 일찍 받아 주는 것까지 쳐도 쿨다운 수 + 1 을 못 넘음. 전에는 두 배였음.
        expect(countSwings(), `model ${modelIndex}`).toBeGreaterThanOrEqual(cooldownCount);
        expect(countSwings(), `model ${modelIndex}`).toBeLessThanOrEqual(cooldownCount + 1);
      }
    });

    it("피해는 캐릭터 기준값의 80 ~ 120 % 안에서 그때그때 달라진다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);
      const { kickDamage, cooldownMs } = DEFAULT_COMBAT;

      await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
      for (const random of [0, 0.5, 0.999]) {
        vi.spyOn(Math, "random").mockReturnValue(random);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();
        vi.advanceTimersByTime(cooldownMs);
      }

      expect(framesOf(fighter, "boss-hit").map((frame) => frame.damage)).toEqual([
        Math.round(kickDamage * 0.8),
        kickDamage,
        Math.round(kickDamage * 1.2),
      ]);
    });

    it("휘두르는 사이 물러나거나 나가면 안 맞는다", async () => {
      const { room, join, send } = createRoom();
      // 닿기까지 가장 오래 걸리는 버거빠따킹(0.45초)으로 봄. 그 사이에 물러날 시간이 있어야 함.
      const fighter = await join(
        clientKey(1),
        "싸움꾼",
        SLOWEST_MODEL_INDEX,
        "ip-1",
        BOSS_FEATURES,
      );
      const leaver = await join(
        clientKey(2),
        "나갈사람",
        SLOWEST_MODEL_INDEX,
        "ip-2",
        BOSS_FEATURES,
      );

      await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
      await moveIntoArena(send, leaver, 2.5, 0.5, Math.PI / 2);
      await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      await send(leaver, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      // 닿기 전에 한 사람은 사거리 밖으로 물러나고 한 사람은 나감.
      vi.advanceTimersByTime(400);
      await send(fighter, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: arena.centerX + 4.5,
        y: arena.floorY,
        z: arena.centerZ,
        yaw: Math.PI / 2,
        isRunning: false,
      });
      room.webSocketClose(leaver.asWebSocket());
      waitForImpact(SLOWEST_MODEL_INDEX);

      expect(framesOf(fighter, "kick")).toHaveLength(2);
      expect(framesOf(fighter, "boss-hit")).toHaveLength(0);
    });

    it("잡으면 처치 시각을 저장하고 순위를 알리며, 서버가 다시 떠도 다음 젠까지 보스가 없다", async () => {
      const { state, room, join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      // 3,000 번 때릴 수는 없어서 체력이 작은 보스로 바꿔 끼움.
      (room as unknown as { boss: BossSimulation }).boss = createBossSimulation(
        DEFAULT_COMBAT.kickDamage * 2,
      );
      await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
      await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      waitForImpact();
      vi.advanceTimersByTime(SPACE_KICK.cooldownMs);
      await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      waitForImpact();

      const killedAt = Date.now();
      const [dead] = framesOf(fighter, "boss-dead");

      expect(dead).toEqual({
        v: SPACE_PROTOCOL_VERSION,
        t: "boss-dead",
        killedAt,
        lastHitSeat: fighter.peer().seat,
        ranking: [
          { seat: fighter.peer().seat, damage: DEFAULT_COMBAT.kickDamage * 2, nickname: "싸움꾼" },
        ],
        serverAt: killedAt,
      });
      expect(parseSpaceServerFrame(JSON.stringify(dead))).toEqual(dead);
      expect(state.storage.put).toHaveBeenCalledWith("space-boss-v1", { lastKilledAt: killedAt });

      // 쓰러지는 연출이 끝나면 사라지고 틱이 멈춤.
      vi.advanceTimersByTime(20_000);
      expect(framesOf(fighter, "boss").at(-1)?.state.phase).toBe("hidden");
      expect(vi.getTimerCount()).toBe(0);

      // 하이버네이션에서 깨어난 서버.
      const restored = createRoom(state);
      const late = await restored.join(clientKey(2), "늦은사람", 0, "ip-2", BOSS_FEATURES);

      expect(framesOf(late, "welcome")[0].boss).toMatchObject({ lastKilledAt: killedAt });
      await moveIntoArena(restored.send, late, -3, 0);
      vi.advanceTimersByTime(3_000);
      expect(framesOf(late, "boss")).toHaveLength(0);
    });

    it("싸우다 나갔다 들어와도 피해가 이어져 순위에 한 줄로 남는다", async () => {
      const { room, join, send } = createRoom();
      const first = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      // 한 대로는 안 죽고, 나가 있는 동안 다 회복하지도 못하는 체력.
      (room as unknown as { boss: BossSimulation }).boss = createBossSimulation(
        DEFAULT_COMBAT.kickDamage * 2,
      );
      await moveIntoArena(send, first, 2.5, 0, Math.PI / 2);
      await send(first, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
      waitForImpact();
      expect(framesOf(first, "boss-hit")).toHaveLength(1);
      room.webSocketClose(first.asWebSocket());

      // 같은 사람이 이름을 바꿔 다시 들어옴.
      const again = await join(clientKey(1), "돌아온꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, again, 2.5, 0, Math.PI / 2);
      for (let swing = 0; swing < 4 && framesOf(again, "boss-dead").length === 0; swing += 1) {
        await send(again, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();
        vi.advanceTimersByTime(DEFAULT_COMBAT.cooldownMs);
      }

      const [dead] = framesOf(again, "boss-dead");

      expect(dead.ranking).toHaveLength(1);
      expect(dead.ranking[0]).toMatchObject({ seat: again.peer().seat, nickname: "돌아온꾼" });
      // 나가기 전에 넣은 한 대가 빠지지 않았음. 다시 들어와서는 한 대만 넣었음.
      expect(framesOf(again, "boss-hit")).toHaveLength(1);
      expect(dead.ranking[0].damage).toBe(DEFAULT_COMBAT.kickDamage * 2);
    });

    it("맞은 뒤 나갔다 바로 들어와도 체력이 가득 차 있지 않다", async () => {
      const { room, join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 10, () => framesOf(fighter, "hp").length > 0);

      const [{ health }] = framesOf(fighter, "hp");

      room.webSocketClose(fighter.asWebSocket());

      const rejoined = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      expect(health).toBeLessThan(SPACE_BOSS_PLAYER.maximumHealth);
      expect(framesOf(rejoined, "welcome")[0].boss?.health).toBe(health);
    });

    it("홀 안에 있으면 지난 시간만큼 체력이 찬다", async () => {
      const { join, send } = createRoom();
      const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

      await moveIntoArena(send, fighter, -2.5, 0);
      await stayActive(send, fighter, 10, () => framesOf(fighter, "hp").length > 0);

      const damaged = attachmentOf(fighter).health ?? 0;

      // 바로 홀 안으로 들어감. 안뜰에 있던 시간은 회복에 안 들어감.
      await send(fighter, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: 10,
        y: 1.5,
        z: 0,
        yaw: 0,
        isRunning: false,
      });
      expect(attachmentOf(fighter).health).toBe(damaged);

      vi.advanceTimersByTime(1_000);
      await send(fighter, {
        v: SPACE_PROTOCOL_VERSION,
        t: "move",
        x: 10.5,
        y: 1.5,
        z: 0,
        yaw: 0,
        isRunning: false,
      });
      expect(attachmentOf(fighter).health).toBeCloseTo(
        Math.min(SPACE_BOSS_PLAYER.maximumHealth, damaged + SPACE_BOSS_PLAYER.hallRegenPerSecond),
      );
    });

    describe("개발용 재등장", () => {
      const respawnEnv = { ...workerEnv, SPACE_BOSS_RESPAWN_SECONDS: "10" } as ChatWorkerEnv;

      /** 재등장 설정을 켠 방. 체력이 작은 보스로 바꿔 끼워 두 대에 잡히게 함. */
      const createRespawnRoom = (state = new RoomState()) => {
        const room = new SpaceRoom(state.asDurableState(), respawnEnv);
        const send = (socket: RoomSocket, frame: unknown) =>
          room.webSocketMessage(socket.asWebSocket(), JSON.stringify(frame));
        const join = async (key: string, ipGuardKey: string) => {
          const socket = new RoomSocket(ipGuardKey);

          state.sockets.push(socket);
          await send(socket, {
            v: SPACE_PROTOCOL_VERSION,
            t: "join",
            clientKey: key,
            nickname: "싸움꾼",
            // 아래 수치가 0번 모델 기준이라 모델을 못 박아 둠.
            modelIndex: 0,
            features: BOSS_FEATURES,
          });

          return socket;
        };

        (room as unknown as { boss: BossSimulation }).boss = createBossSimulation(
          DEFAULT_COMBAT.kickDamage,
        );

        return { state, room, send, join };
      };

      it("잡으면 쓰러지는 연출 뒤 정해진 초가 지나 다시 나오고 모두에게 알린다", async () => {
        const { state, send, join } = createRespawnRoom();
        const fighter = await join(clientKey(1), "ip-1");

        await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();

        expect(framesOf(fighter, "boss-dead")).toHaveLength(1);
        // 처치 시각을 저장하지 않음. 서버가 다시 떠도 보스가 있어야 함.
        expect(state.storage.put).not.toHaveBeenCalledWith("space-boss-v1", expect.anything());

        vi.advanceTimersByTime(SPACE_BOSS_DEATH.totalSeconds * 1000 + 10_000 - 1);
        expect(framesOf(fighter, "boss-spawn")).toHaveLength(0);

        vi.advanceTimersByTime(1);

        const [spawn] = framesOf(fighter, "boss-spawn");

        expect(spawn).toEqual({
          v: SPACE_PROTOCOL_VERSION,
          t: "boss-spawn",
          spawnedAt: Date.now(),
          serverAt: Date.now(),
        });
        expect(parseSpaceServerFrame(JSON.stringify(spawn))).toEqual(spawn);

        // 다시 나온 보스는 체력이 가득이고, 등장이 끝나면 또 때릴 수 있음.
        vi.advanceTimersByTime(5_000);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();

        expect(framesOf(fighter, "boss-dead")).toHaveLength(2);
      });

      it("다시 나온 뒤에 들어온 사람은 처치 기록 없이 보스를 본다", async () => {
        const { send, join } = createRespawnRoom();
        const fighter = await join(clientKey(1), "ip-1");

        await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();
        vi.advanceTimersByTime(SPACE_BOSS_DEATH.totalSeconds * 1000 + 10_000);

        const late = await join(clientKey(2), "ip-2");

        expect(framesOf(late, "welcome")[0].boss).toMatchObject({ lastKilledAt: null });
      });

      it("설정을 켜기 전에 저장된 처치 기록이 있어도 보스가 나온다", async () => {
        const state = new RoomState();

        await state.storage.put("space-boss-v1", { lastKilledAt: Date.now() - 1_000 });

        const { join } = createRespawnRoom(state);
        const fighter = await join(clientKey(1), "ip-1");

        expect(framesOf(fighter, "welcome")[0].boss).toMatchObject({ lastKilledAt: null });
      });

      it("설정이 없으면 다시 나오지 않는다", async () => {
        const { room, join, send } = createRoom();
        const fighter = await join(clientKey(1), "싸움꾼", 0, "ip-1", BOSS_FEATURES);

        (room as unknown as { boss: BossSimulation }).boss = createBossSimulation(
          DEFAULT_COMBAT.kickDamage,
        );
        await moveIntoArena(send, fighter, 2.5, 0, Math.PI / 2);
        await send(fighter, { v: SPACE_PROTOCOL_VERSION, t: "kick" });
        waitForImpact();
        vi.advanceTimersByTime(60_000);

        expect(framesOf(fighter, "boss-dead")).toHaveLength(1);
        expect(framesOf(fighter, "boss-spawn")).toHaveLength(0);
      });
    });
  });
});
