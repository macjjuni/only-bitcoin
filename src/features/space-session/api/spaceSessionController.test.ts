import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeSpaceSnapshot,
  type LocalPlayerState,
  SPACE_BOSS,
  SPACE_BOSS_PLAYER,
  SPACE_PROTOCOL_VERSION,
  type SpaceBossWire,
  type SpacePeer,
} from "@/entities/space";
import { resolveSpaceWebSocketUrl } from "@/shared/config/space";
import { SpaceSessionController, type SpaceSessionSocket } from "./spaceSessionController";

const requestId = "11111111-1111-4111-8111-111111111111";
const identity = { clientKey: "a".repeat(43), nickname: "익명" };
const self: SpacePeer = {
  seat: 0,
  nickname: "익명",
  colorIndex: 0,
  modelIndex: 0,
  x: 0,
  z: 0,
  y: 0,
  yaw: 0,
  isRunning: false,
};
const remote: SpacePeer = { ...self, seat: 1, nickname: "다른 사용자", x: 5 };

class FakeSocket extends EventTarget implements SpaceSessionSocket {
  readyState = 0;
  bufferedAmount = 0;
  binaryType: BinaryType = "blob";
  sent: string[] = [];

  send(payload: string): void {
    if (this.readyState !== 1) {
      throw new Error("closed socket");
    }
    this.sent.push(payload);
  }

  close(): void {
    this.readyState = 3;
    this.emitClose(1000);
  }

  open(): void {
    this.readyState = 1;
    this.dispatchEvent(new Event("open"));
  }

  receive(payload: unknown): void {
    this.dispatchEvent(
      new MessageEvent("message", {
        data:
          typeof payload === "object" && !(payload instanceof ArrayBuffer)
            ? JSON.stringify(payload)
            : payload,
      }),
    );
  }

  emitClose(code = 1006): void {
    this.readyState = 3;
    const event = new Event("close");
    Object.assign(event, { code });
    this.dispatchEvent(event);
  }
}

const createHarness = (webSocketUrl = "wss://example.com/v1/space/ws") => {
  const sockets: FakeSocket[] = [];
  const controller = new SpaceSessionController({
    identity,
    modelIndex: 0,
    webSocketUrl,
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    now: () => Date.now(),
    random: () => 0,
    createRequestId: () => requestId,
  });

  const welcome = (
    socket = sockets[sockets.length - 1],
    peers: SpacePeer[] = [],
    features?: string[],
  ) => {
    socket.open();
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self,
      peers,
      ...(features ? { features } : {}),
    });
    return socket;
  };

  return { controller, sockets, welcome };
};

const movement = (x: number, y = 0): LocalPlayerState => ({
  x,
  y,
  z: 0,
  yaw: 0,
  isGrounded: true,
  velocityX: 0,
  velocityZ: 0,
  velocityY: 0,
  isRunning: false,
});

const sentFrames = (socket: FakeSocket, type: string) =>
  socket.sent
    .filter((payload) => payload !== "ping")
    .map((payload) => JSON.parse(payload))
    .filter((frame) => frame.t === type);

describe("SpaceSessionController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("서버 시계는 왕복 지연의 중간값으로 보정하고 상승 이벤트 중복을 무시한다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome(undefined, [], ["market-sync-v1"]);
    const sentAt = sentFrames(socket, "clock")[0].sentAt;
    vi.advanceTimersByTime(100);
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "clock", sentAt, serverAt: sentAt + 50 + 5000 });
    expect(controller.getSnapshot().serverClockOffsetMs).toBe(5000);
    const event = { id: "rise-1", startsAt: 7000, seed: 123 };
    const state = {
      revision: 1,
      track: "surge",
      direction: "rise",
      startsAt: 7000,
      prefetch: true,
      celebration: event,
    };
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "market", state, serverAt: 6100 });
    const snapshot = controller.getSnapshot();
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "market", state, serverAt: 6100 });
    expect(controller.getSnapshot()).toBe(snapshot);
    expect(snapshot.celebration).toEqual(event);
    expect(controller.requestCelebration()).toBe(true);
    expect(sentFrames(socket, "celebrate")).toHaveLength(1);
  });

  it("새 테스트 폭죽을 오래된 상승 프리패치 프레임으로 되돌리지 않는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome(undefined, [], ["market-sync-v1"]);
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "celebrate",
      event: { id: "test-2", startsAt: 3000, seed: 2 },
      serverAt: 2200,
    });
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "market",
      state: {
        revision: 2,
        track: "surge",
        direction: "rise",
        startsAt: 2000,
        prefetch: false,
        celebration: { id: "rise-1", startsAt: 2000, seed: 1 },
      },
      serverAt: 2300,
    });
    expect(controller.getSnapshot().celebration?.id).toBe("test-2");
    controller.stop();
    expect(controller.getSnapshot().celebration).toBeNull();
    expect(controller.requestCelebration()).toBe(false);
  });

  it("welcome 기록은 패널 목록에만 합치고 중복 없이 최근 100개를 유지한다", () => {
    const { controller, sockets } = createHarness();
    controller.start();
    const chatMessage = (index: number) => ({
      id: `message-${index}`,
      rid: "33333333-3333-4333-8333-333333333333",
      seat: 1,
      nickname: "다른사람",
      body: `메시지 ${index}`,
      createdAt: index,
    });
    const socket = sockets[0];
    socket.open();

    // 재접속 전에 이미 본 메시지 70개.
    for (let index = 0; index < 70; index += 1) {
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message: chatMessage(index) });
    }
    // 서버 기록은 그중 마지막 20개와 그 뒤 새 메시지 30개.
    const history = Array.from({ length: 50 }, (_, offset) => chatMessage(50 + offset));
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "welcome", self, peers: [], messages: history });

    const { messages, bubbleMessages } = controller.getSnapshot();
    expect(messages).toHaveLength(100);
    expect(messages[0].id).toBe("message-0");
    expect(messages.at(-1)?.id).toBe("message-99");
    expect(bubbleMessages).toHaveLength(0);
  });

  it("채팅 URL의 호스트만 재사용하고 경로·쿼리는 공간 엔드포인트로 바꾼다", () => {
    expect(resolveSpaceWebSocketUrl("wss://example.com/v1/chat/ws?token=old#hash")).toBe(
      "wss://example.com/v1/space/ws",
    );
    expect(resolveSpaceWebSocketUrl("")).toBe("");
  });

  it("welcome 전에는 접속 중이며 일반 브라우저 신원으로 join하고 roster를 유지한다", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    expect(controller.getSnapshot().presence.status).toBe("connecting");
    const socket = welcome(sockets[0], [remote]);

    expect(sentFrames(socket, "join")).toEqual([
      {
        v: SPACE_PROTOCOL_VERSION,
        t: "join",
        ...identity,
        modelIndex: 0,
        features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1"],
      },
    ]);
    expect(socket.binaryType).toBe("arraybuffer");
    expect(controller.getSnapshot().presence).toEqual({ status: "online", occupantCount: 2 });
    const roster = controller.getSnapshot().remotePlayers;
    expect(roster.map(({ seat }) => seat)).toEqual([1]);
    expect(controller.sampleRemotePlayers(Date.now())).toBe(roster);

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat: 1 });
    expect(controller.getSnapshot().remotePlayers).toHaveLength(0);
    expect(controller.getSnapshot().presence.occupantCount).toBe(1);
    controller.stop();
  });

  it("변경된 위치만 초당 최대 10회 보내고 숨김 중에는 멈췄다가 최신 위치를 보낸다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();

    for (let frameIndex = 0; frameIndex < 100; frameIndex += 1) {
      controller.publishMovement(movement(frameIndex + 1));
      vi.advanceTimersByTime(10);
    }
    expect(sentFrames(socket, "move")).toHaveLength(10);

    controller.publishMovement(movement(100));
    const sentCount = sentFrames(socket, "move").length;
    vi.advanceTimersByTime(1_000);
    controller.publishMovement(movement(100));
    expect(sentFrames(socket, "move")).toHaveLength(sentCount);

    controller.setVisibility(false);
    controller.publishMovement(movement(101));
    vi.advanceTimersByTime(200);
    expect(sentFrames(socket, "move")).toHaveLength(sentCount);
    controller.setVisibility(true);
    expect(sentFrames(socket, "move").at(-1)).toMatchObject({ x: 101 });
    controller.stop();
  });

  it("탭이 1분 넘게 숨어 있으면 연결을 끊고 다시 보이면 새로 접속함", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    // 숨은 탭도 서버 pong 은 계속 받음. heartbeat 타임아웃과 섞이지 않게 흉내 냄.
    const advanceWithPong = (ms: number): void => {
      for (let elapsed = 0; elapsed < ms; elapsed += 10_000) {
        vi.advanceTimersByTime(Math.min(10_000, ms - elapsed));
        if (socket.readyState === 1) {
          socket.receive("pong");
        }
      }
    };

    controller.setVisibility(false);
    advanceWithPong(59_000);
    expect(socket.readyState).toBe(1);
    controller.setVisibility(true);
    controller.setVisibility(false);
    advanceWithPong(59_000);
    expect(socket.readyState).toBe(1);

    advanceWithPong(1_000);
    expect(socket.readyState).toBe(3);
    expect(controller.getSnapshot().presence.status).toBe("offline");
    expect(sockets).toHaveLength(1);

    controller.setVisibility(true);
    expect(sockets).toHaveLength(2);
    controller.stop();
  });

  it("30fps 프레임에서도 평균 100ms 박자로 보냄", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const startedAt = Date.now();

    for (let frameIndex = 0; frameIndex < 90; frameIndex += 1) {
      vi.setSystemTime(startedAt + Math.round((frameIndex * 1000) / 30));
      controller.publishMovement(movement(frameIndex + 1));
    }
    expect(sentFrames(socket, "move")).toHaveLength(30);
    controller.stop();
  });

  it("잠깐 멈췄다 다시 움직여도 전송 간격이 84ms보다 붙지 않음", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const startedAt = Date.now();
    const sentAt: number[] = [];
    const publishAt = (offset: number, x: number): void => {
      vi.setSystemTime(startedAt + offset);
      const before = sentFrames(socket, "move").length;
      controller.publishMovement(movement(x));
      if (sentFrames(socket, "move").length > before) {
        sentAt.push(offset);
      }
    };

    publishAt(0, 1);
    publishAt(100, 2);
    // 150 ms 멈춤. 같은 위치는 안 보냄.
    publishAt(200, 2);
    publishAt(250, 2);
    for (let offset = 260; offset <= 500; offset += 10) {
      publishAt(offset, offset);
    }
    const gaps = sentAt.slice(1).map((offset, index) => offset - sentAt[index]);
    expect(gaps.every((gap) => gap >= 84)).toBe(true);
    controller.stop();
  });

  it("서버 자기 좌표 보정은 self를 갱신하고 과거 위치를 자동으로 재송신하지 않는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    controller.publishMovement(movement(20));
    const socket = welcome();
    expect(sentFrames(socket, "move")).toHaveLength(0);

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...self, x: 3 } });
    expect(controller.getSnapshot().self?.x).toBe(3);
    controller.publishMovement(movement(3));
    expect(sentFrames(socket, "move")).toHaveLength(0);
    controller.stop();
  });

  it("cm 미만 위치·8비트보다 작은 시선 흔들림은 보내지 않고 달리기 상태 변화는 보낸다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    controller.publishMovement({ ...movement(0.004), yaw: 0.001 });
    expect(sentFrames(socket, "move")).toHaveLength(0);

    controller.publishMovement({ ...movement(1.234), z: -2.345, yaw: Math.PI / 2 });
    expect(sentFrames(socket, "move").at(-1)).toMatchObject({
      x: 1.23,
      z: -2.35,
      y: 0,
      yaw: Math.PI / 2,
    });
    vi.advanceTimersByTime(100);
    controller.publishMovement({
      ...movement(1.234),
      z: -2.345,
      yaw: Math.PI / 2,
      isRunning: true,
    });
    expect(sentFrames(socket, "move").at(-1)).toMatchObject({ isRunning: true });
    controller.stop();
  });

  it("바이너리 위치 갱신은 React 스냅샷을 알리지 않고 같은 원격 객체에 보간한다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome(undefined, [remote]);
    const onChange = vi.fn();
    controller.subscribe(onChange);
    const players = controller.getSnapshot().remotePlayers;
    socket.receive(encodeSpaceSnapshot({ timestamp: 100, players: [{ ...remote, x: 7 }] }));
    expect(onChange).not.toHaveBeenCalled();
    // 재생 지연이 2칸(200 ms)이라 그만큼 지나야 도착 위치에 닿음.
    expect(controller.sampleRemotePlayers(Date.now() + 200)).toBe(players);
    expect(players[0].x).toBe(7);
    controller.stop();
  });

  it("현재 자기 발화 echo만 성공 처리하고 pending 중 중복 발화를 막는다", async () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const result = controller.sendMessage(" 안녕하세요 ");
    expect(controller.getSnapshot().isMessagePending).toBe(true);
    expect(await controller.sendMessage("중복")).toBe(false);
    expect(sentFrames(socket, "say")).toEqual([
      { v: SPACE_PROTOCOL_VERSION, t: "say", rid: requestId, body: "안녕하세요" },
    ]);

    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      message: {
        id: requestId,
        rid: requestId,
        seat: 0,
        nickname: "익명",
        body: "안녕하세요",
        createdAt: Date.now(),
      },
    });
    expect(await result).toBe(true);
    expect(controller.getSnapshot().isMessagePending).toBe(false);
    expect(controller.getSnapshot().messages).toHaveLength(1);
    controller.stop();
  });

  it("서버 거절·확인 시간 초과·단절은 전송 실패로 끝내고 이유를 제공한다", async () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const rejected = controller.sendMessage("거절");
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      rid: requestId,
      code: "RATE_LIMITED",
      message: "잠시 후 전송해 주세요.",
    });
    expect(await rejected).toBe(false);
    expect(controller.getSnapshot().error).toBe("잠시 후 전송해 주세요.");

    const timedOut = controller.sendMessage("확인 대기");
    vi.advanceTimersByTime(10_000);
    expect(await timedOut).toBe(false);
    expect(controller.getSnapshot().error).toContain("확인 시간");

    const disconnected = controller.sendMessage("연결 끊김");
    socket.emitClose();
    expect(await disconnected).toBe(false);
    expect(controller.getSnapshot().isMessagePending).toBe(false);
    controller.stop();
  });

  it("요청 단위 서버 예외는 그 발화만 실패시키고 좌석·위치를 유지한다", async () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const failed = controller.sendMessage("일시적 실패");
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      rid: requestId,
      code: "UNAVAILABLE",
      message: "공간 요청을 처리하지 못했어요.",
    });

    expect(await failed).toBe(false);
    // 메시지 한 번 실패했다고 재접속·리스폰까지 하면 안 됨.
    expect(controller.getSnapshot().presence.status).toBe("online");
    expect(controller.getSnapshot().self).not.toBeNull();
    vi.advanceTimersByTime(30_000);
    expect(sockets).toHaveLength(1);
    controller.stop();
  });

  it("요청과 무관한 서버 예외와 좌석 상실 응답은 다시 접속한다", () => {
    const unavailable = createHarness();
    unavailable.controller.start();
    unavailable.welcome();
    unavailable.sockets[0].receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "UNAVAILABLE",
      message: "공간 요청을 처리하지 못했어요.",
    });
    vi.advanceTimersByTime(750);
    expect(unavailable.sockets).toHaveLength(2);
    unavailable.controller.stop();

    // 서버가 좌석을 모른다고 하면 rid 가 붙어 있어도 연결을 다시 세워야 함.
    const joinRequired = createHarness();
    joinRequired.controller.start();
    joinRequired.welcome();
    joinRequired.sockets[0].receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      rid: requestId,
      code: "JOIN_REQUIRED",
      message: "먼저 공간에 입장해 주세요.",
    });
    expect(joinRequired.controller.getSnapshot().self).toBeNull();
    vi.advanceTimersByTime(750);
    expect(joinRequired.sockets).toHaveLength(2);
    joinRequired.controller.stop();
  });

  it("재접속 지연 중 이전 소켓 이벤트를 무시하고 stop 후 타이머를 남기지 않는다", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const previous = welcome();
    previous.emitClose();
    vi.advanceTimersByTime(749);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    welcome();
    previous.receive({ v: SPACE_PROTOCOL_VERSION, t: "full" });
    expect(controller.getSnapshot().presence.status).toBe("online");

    controller.stop();
    const count = sockets.length;
    vi.advanceTimersByTime(120_000);
    expect(sockets).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { v: SPACE_PROTOCOL_VERSION, t: "full" },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "SESSION_REPLACED",
      message: "다른 탭에서 연결됨",
    },
    "invalid json",
  ])("방 만원·세션 교체·잘못된 프로토콜에서는 수동 재시도 전까지 멈춘다: %j", (payload) => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    socket.receive(payload);
    vi.advanceTimersByTime(120_000);
    expect(sockets).toHaveLength(1);
    expect(controller.getSnapshot().presence.status).toBe("offline");
    controller.retry();
    expect(sockets).toHaveLength(2);
    controller.stop();
  });

  it("heartbeat만 주기적으로 보내며 pong을 일반 프로토콜로 파싱하지 않는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    vi.advanceTimersByTime(15_000);
    expect(socket.sent.filter((payload) => payload === "ping")).toHaveLength(1);
    socket.receive("pong");
    expect(controller.getSnapshot().presence.status).toBe("online");
    expect(sentFrames(socket, "move")).toHaveLength(0);
    controller.stop();
  });

  it("입장 닉네임 거절은 멈추고 일시적인 입장 장애는 join timeout 대기 없이 재접속한다", () => {
    const permanent = createHarness();
    permanent.controller.start();
    permanent.sockets[0].open();
    permanent.sockets[0].receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "INVALID_NICKNAME",
      message: "사용할 수 없는 닉네임입니다.",
    });
    vi.advanceTimersByTime(30_000);
    expect(permanent.sockets).toHaveLength(1);
    expect(permanent.controller.getSnapshot().error).toContain("닉네임");
    permanent.controller.stop();

    const transient = createHarness();
    transient.controller.start();
    transient.sockets[0].open();
    transient.sockets[0].receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "UNAVAILABLE",
      message: "잠시 후 다시 입장해 주세요.",
    });
    vi.advanceTimersByTime(750);
    expect(transient.sockets).toHaveLength(2);
    transient.controller.stop();
  });

  it("교체 close code만 수신해도 자동 재접속으로 다른 탭을 다시 밀어내지 않는다", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    welcome().emitClose(4001);
    vi.advanceTimersByTime(120_000);
    expect(sockets).toHaveLength(1);
    expect(controller.getSnapshot().error).toContain("다른 탭");
    controller.stop();
  });

  it("업그레이드 한도 close code는 쉬는 시간이 지난 뒤에만 다시 올라간다", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    welcome().emitClose(4010);
    expect(controller.getSnapshot().error).toContain("접속 요청이 많아요");

    // 백오프(최대 30초)가 먼저 깨워도 창이 남은 동안은 소켓을 안 만듦.
    vi.advanceTimersByTime(59_000);
    expect(sockets).toHaveLength(1);
    // 창이 남았으면 재시도 버튼도 안 올라감. 다시 때리면 창만 길어짐.
    controller.retry();
    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(2_000);
    expect(sockets).toHaveLength(2);
    controller.stop();
  });

  it("재시도 연타는 최소 간격 안에서 업그레이드 요청이 되지 않는다", () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    welcome().emitClose(1006);
    expect(sockets).toHaveLength(1);

    controller.retry();
    expect(sockets).toHaveLength(2);
    controller.retry();
    controller.retry();
    expect(sockets).toHaveLength(2);

    vi.advanceTimersByTime(5_000);
    controller.retry();
    expect(sockets).toHaveLength(3);
    controller.stop();
  });

  it("메시지는 최신 100개만 보존하고 중복 echo를 중복 표시하지 않는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    for (let index = 0; index < 101; index += 1) {
      const message = {
        id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
        rid: requestId,
        seat: 0,
        nickname: "익명",
        body: `메시지 ${index}`,
        createdAt: Date.now(),
      };
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
    }
    expect(controller.getSnapshot().messages).toHaveLength(100);
    expect(controller.getSnapshot().bubbleMessages).toHaveLength(100);
    expect(controller.getSnapshot().messages[0].body).toBe("메시지 1");
    controller.stop();
  });

  it("퇴장·좌석 교체는 과거 발화 말풍선을 즉시 지우고 채팅 로그는 보존한다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome(undefined, [remote]);
    const message = {
      id: requestId,
      rid: requestId,
      seat: remote.seat,
      nickname: remote.nickname,
      body: "이전 사용자 발화",
      createdAt: Date.now(),
    };

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
    expect(controller.getSnapshot().bubbleMessages).toEqual([message]);
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat: remote.seat });
    expect(controller.getSnapshot().bubbleMessages).toEqual([]);
    expect(controller.getSnapshot().messages).toEqual([message]);

    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "peer",
      peer: { ...remote, nickname: "새 사용자" },
    });
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
    expect(controller.getSnapshot().bubbleMessages).toEqual([]);
    expect(controller.getSnapshot().messages).toEqual([message]);

    const replacementMessage = { ...message, id: "second-message", body: "교체 전 사용자 발화" };
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message: replacementMessage });
    expect(controller.getSnapshot().bubbleMessages).toEqual([replacementMessage]);
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "peer",
      peer: { ...remote, nickname: "다른 탭 사용자" },
    });
    expect(controller.getSnapshot().bubbleMessages).toEqual([]);
    expect(controller.getSnapshot().messages).toEqual([message, replacementMessage]);
    controller.stop();
  });

  it("새 welcome과 연결 정리는 말풍선만 비우고 기존 채팅 로그를 유지한다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const message = {
      id: requestId,
      rid: requestId,
      seat: 0,
      nickname: "익명",
      body: "기록",
      createdAt: Date.now(),
    };
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "welcome", self, peers: [] });
    expect(controller.getSnapshot().bubbleMessages).toEqual([]);
    expect(controller.getSnapshot().messages).toEqual([message]);

    const nextMessage = { ...message, id: "next-message" };
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "say", message: nextMessage });
    controller.stop();
    expect(controller.getSnapshot().bubbleMessages).toEqual([]);
    expect(controller.getSnapshot().messages).toEqual([message, nextMessage]);
  });

  it("서버 설정이 없으면 접속을 생성하지 않고 오프라인 이유를 알린다", () => {
    const { controller, sockets } = createHarness("");
    controller.start();
    expect(sockets).toHaveLength(0);
    expect(controller.getSnapshot().presence.status).toBe("offline");
    expect(controller.getSnapshot().error).toContain("설정");
    controller.stop();
  });

  it("아바타 변경은 서버가 되돌려준 peer 로 확정하고 재접속에도 이어진다", async () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();

    const changed = controller.changeModel(1);
    expect(sentFrames(socket, "model")).toEqual([
      { v: SPACE_PROTOCOL_VERSION, t: "model", rid: requestId, modelIndex: 1 },
    ]);

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...self, modelIndex: 1 } });
    expect(await changed).toBe(true);
    expect(controller.getSnapshot().self?.modelIndex).toBe(1);

    // 끊겼다 다시 들어갈 때 옛 모델로 입장하면 바꾼 의미가 없음.
    socket.emitClose();
    vi.advanceTimersByTime(750);
    sockets[1].open();
    expect(sentFrames(sockets[1], "join")).toEqual([
      {
        v: SPACE_PROTOCOL_VERSION,
        t: "join",
        clientKey: identity.clientKey,
        nickname: identity.nickname,
        modelIndex: 1,
        features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1"],
      },
    ]);
    controller.stop();
  });

  it("아바타를 바꾸는 중 연결이 끊기면 보류를 비워 다시 시도할 수 있게 둔다", async () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();

    const changed = controller.changeModel(1);
    // 구 버전 서버는 모르는 프레임을 받으면 연결을 끊음. 보류가 남으면
    // 타임아웃이 뜰 때까지 다음 시도가 조용히 막힘.
    socket.emitClose();
    expect(await changed).toBe(false);

    vi.advanceTimersByTime(750);
    const retried = sockets[1];
    retried.open();
    retried.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self: { ...self, modelIndex: 1 },
      peers: [],
    });
    expect(controller.changeModel(2)).toBeInstanceOf(Promise);
    expect(sentFrames(retried, "model")).toEqual([
      { v: SPACE_PROTOCOL_VERSION, t: "model", rid: requestId, modelIndex: 2 },
    ]);
    controller.stop();
  });

  it("아바타 변경이 rid 오류로 거절되면 연결을 지키고 보류만 비운다", async () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();

    const changed = controller.changeModel(1);
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "INVALID_PROTOCOL",
      message: "입력 형식을 확인해 주세요.",
      rid: requestId,
    });
    expect(await changed).toBe(false);
    expect(controller.getSnapshot().presence.status).toBe("online");
    expect(controller.getSnapshot().self?.modelIndex).toBe(0);
    // 보류가 비어 같은 연결에서 바로 다시 보낼 수 있음.
    expect(controller.changeModel(2)).toBeInstanceOf(Promise);
    expect(sentFrames(socket, "model")).toHaveLength(2);
    controller.stop();
  });

  it("닉네임 변경은 서버가 되돌려준 peer 로 확정하고 재접속에도 이어진다", async () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();

    const renamed = controller.changeNickname("새이름");
    expect(sentFrames(socket, "nick")).toEqual([
      { v: SPACE_PROTOCOL_VERSION, t: "nick", rid: requestId, nickname: "새이름" },
    ]);
    expect(controller.getSnapshot().isNicknamePending).toBe(true);

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...self, nickname: "새이름" } });
    expect(await renamed).toBe(true);
    expect(controller.getSnapshot().self?.nickname).toBe("새이름");
    expect(controller.getSnapshot().isNicknamePending).toBe(false);

    // 끊겼다 다시 들어갈 때 옛 이름으로 입장하면 바꾼 의미가 없음.
    socket.emitClose();
    vi.advanceTimersByTime(750);
    sockets[1].open();
    expect(sentFrames(sockets[1], "join")).toEqual([
      {
        v: SPACE_PROTOCOL_VERSION,
        t: "join",
        clientKey: identity.clientKey,
        nickname: "새이름",
        modelIndex: 0,
        features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1"],
      },
    ]);
    controller.stop();
  });

  it("닉네임 거절은 연결을 끊지 않고 그 요청만 실패시킨다", async () => {
    const { controller, sockets, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    const rejected = controller.changeNickname("##");
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      rid: requestId,
      code: "INVALID_NICKNAME",
      message: "사용할 수 없는 닉네임입니다.",
    });

    expect(await rejected).toBe(false);
    // 입장 때 같은 코드면 영구 오류지만 이름 변경이면 입력만 고치면 됨.
    expect(controller.getSnapshot().presence.status).toBe("online");
    expect(controller.getSnapshot().self?.nickname).toBe("익명");
    vi.advanceTimersByTime(30_000);
    expect(sockets).toHaveLength(1);
    controller.stop();
  });

  it("이름만 바뀐 peer 프레임은 위치를 되감지 않는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    controller.publishMovement(movement(4));
    const beforeMoves = sentFrames(socket, "move").length;

    // 서버는 이름만 바뀌어도 현재 좌표를 그대로 담아 보냄.
    socket.receive({
      v: SPACE_PROTOCOL_VERSION,
      t: "peer",
      peer: { ...self, x: 4, nickname: "새이름" },
    });
    vi.advanceTimersByTime(200);
    controller.publishMovement(movement(4));

    // 되감으면 같은 자리를 한 번 더 보냄.
    expect(sentFrames(socket, "move").length).toBe(beforeMoves);
    controller.stop();
  });

  it("서버가 이동을 거절하면 좌표를 되감는다", () => {
    const { controller, welcome } = createHarness();
    controller.start();
    const socket = welcome();
    controller.publishMovement(movement(4));
    const beforeMoves = sentFrames(socket, "move").length;

    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...self, x: 0 } });
    vi.advanceTimersByTime(200);
    controller.publishMovement(movement(4));

    expect(sentFrames(socket, "move").length).toBeGreaterThan(beforeMoves);
    controller.stop();
  });

  describe("발차기", () => {
    it("입장 때 발차기를 안다고 알리고 서버가 지원해야 canKick 이 켜짐", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const oldServer = welcome();

      expect(sentFrames(oldServer, "join")[0]).toMatchObject({
        features: ["kick", "market-sync-v1", "kick-timing-v1", "boss-v1"],
      });
      expect(controller.getSnapshot().canKick).toBe(false);
      expect(controller.sendKick()).toBe(false);
      controller.stop();

      const next = createHarness();
      next.controller.start();
      const socket = next.welcome(undefined, [remote], ["kick"]);

      expect(next.controller.getSnapshot().canKick).toBe(true);
      expect(next.controller.sendKick()).toBe(true);
      expect(sentFrames(socket, "kick")).toEqual([{ v: SPACE_PROTOCOL_VERSION, t: "kick" }]);
      next.controller.stop();
    });

    it("받은 발차기를 큐에 쌓고 꺼내면 비움. React 스냅샷은 안 건드림", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick"]);
      const onChange = vi.fn();
      controller.subscribe(onChange);

      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, to: 0, dirX: -1, dirZ: 0 });
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, dirX: 0, dirZ: 1 });

      expect(onChange).not.toHaveBeenCalled();
      // 옛 서버가 실어 보내는 맞은 사람(`to`)과 방향은 안 읽음.
      expect(controller.drainKickEvents()).toEqual([
        { from: 1, startedAt: 1000 },
        { from: 1, startedAt: 1000 },
      ]);
      expect(controller.drainKickEvents()).toEqual([]);
      controller.stop();
    });

    it("탭이 멈춰 있던 동안 쌓인 1초 넘은 발차기는 버림", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick"]);

      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, to: 0, dirX: -1, dirZ: 0 });
      vi.advanceTimersByTime(5_000);
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, dirX: 0, dirZ: 1 });

      expect(controller.drainKickEvents()).toEqual([{ from: 1, startedAt: 6000 }]);
      controller.stop();
    });

    it("모르는 새 서버 프레임은 끊지 않고 무시함", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome();

      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "dance", seat: 1 });

      expect(controller.getSnapshot().presence.status).toBe("online");
      expect(controller.getSnapshot().error).toBeNull();
      controller.stop();
    });

    it.each([
      100, 200, 400,
    ])("왕복 %dms에서도 내 공격은 원래 시작 시각을 유지하고 중복 수신을 무시함", (roundTripMs) => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick", "kick-timing-v1"]);
      const clockSentAt = sentFrames(socket, "clock")[0].sentAt;
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "clock",
        sentAt: clockSentAt,
        serverAt: clockSentAt + 5000,
      });
      controller.sendKick();
      const attack = sentFrames(socket, "kick")[0];
      expect(attack).toMatchObject({ id: requestId, startedAt: 6000 });
      vi.advanceTimersByTime(roundTripMs);
      const response = {
        v: SPACE_PROTOCOL_VERSION,
        t: "kick",
        id: attack.id,
        startedAt: attack.startedAt,
        serverAt: attack.startedAt + roundTripMs / 2,
        from: 0,
        dirX: 1,
        dirZ: 0,
      };
      socket.receive(response);
      socket.receive(response);
      const events = controller.drainKickEvents();
      expect(events).toHaveLength(1);
      expect(events[0].startedAt).toBe(1000);
      controller.stop();
    });

    it("보는 쪽도 서버 시계로 전송 중 지난 시간을 빼고, 늦은 공격은 다시 재생하지 않음", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick", "kick-timing-v1"]);
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "clock", sentAt: 1000, serverAt: 6000 });
      vi.advanceTimersByTime(200);
      const response = {
        v: SPACE_PROTOCOL_VERSION,
        t: "kick",
        id: requestId,
        from: 1,
        dirX: -1,
        dirZ: 0,
        startedAt: 6000,
        serverAt: 6100,
      };
      socket.receive(response);
      const [event] = controller.drainKickEvents();
      expect(Date.now() - event.startedAt).toBe(200);
      vi.advanceTimersByTime(2000);
      socket.receive({ ...response, id: "22222222-2222-4222-8222-222222222222" });
      expect(controller.drainKickEvents()).toEqual([]);
      controller.stop();
    });

    it("공격 직전 위치는 평소 전송 주기를 기다리지 않고 보내며 혼잡한 소켓은 건너뜀", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick"]);
      controller.publishMovement(movement(1));
      vi.advanceTimersByTime(10);
      const beforeAttack = socket.sent.length;
      expect(controller.sendKick(movement(1.1))).toBe(true);
      expect(socket.sent.slice(beforeAttack).map((frame) => JSON.parse(frame).t)).toEqual([
        "move",
        "kick",
      ]);
      expect(sentFrames(socket, "move").at(-1).x).toBe(1.1);
      controller.publishMovement(movement(1.2), true);
      expect(sentFrames(socket, "move").at(-1).x).toBe(1.2);
      socket.bufferedAmount = 20_000;
      expect(controller.sendKick(movement(1.3))).toBe(false);
      expect(sentFrames(socket, "move").at(-1).x).toBe(1.2);
      controller.stop();
    });

    it("탭이 숨기 전과 숨은 동안 수신한 공격을 복귀 후 재생하지 않음", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick"]);
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, to: 0, dirX: 1, dirZ: 0 });
      controller.setVisibility(false);
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, to: 0, dirX: 1, dirZ: 0 });
      controller.setVisibility(true);
      expect(controller.drainKickEvents()).toEqual([]);
      controller.stop();
    });

    it("수신 큐의 대기 시간이 짧아도 원래 공격 시작부터 오래 지난 이벤트는 버림", () => {
      const { controller, welcome } = createHarness();
      controller.start();
      const socket = welcome(undefined, [remote], ["kick", "kick-timing-v1"]);
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "clock", sentAt: 1000, serverAt: 6000 });
      vi.advanceTimersByTime(600);
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "kick",
        id: requestId,
        from: 1,
        to: 0,
        dirX: 1,
        dirZ: 0,
        startedAt: 6000,
        serverAt: 6200,
      });
      vi.advanceTimersByTime(500);
      expect(controller.drainKickEvents()).toEqual([]);
      controller.stop();
    });
  });

  describe("레이드 보스", () => {
    /** 서버 시각. 테스트의 로컬 시각은 1,000 ms 에서 시작함. */
    const SERVER_NOW = Date.parse("2026-11-13T13:25:00+09:00");
    const BOSS_FEATURES = ["kick", "boss-v1"];
    const bossWire: SpaceBossWire = {
      phase: "run",
      attack: null,
      phaseStartedAt: SERVER_NOW,
      x: SPACE_BOSS.arena.centerX + 3,
      z: SPACE_BOSS.arena.centerZ,
      yaw: 0,
      attackOriginX: SPACE_BOSS.arena.centerX,
      attackOriginZ: SPACE_BOSS.arena.centerZ,
      speed: 4,
      health: 2_400,
      maximumHealth: 3_000,
      targetSeat: 0,
    };

    const joinWithBoss = (boss: Record<string, unknown> | null) => {
      const harness = createHarness();

      harness.controller.start();
      const socket = harness.sockets[0];

      socket.open();
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "welcome",
        self,
        peers: [],
        features: BOSS_FEATURES,
        ...(boss ? { boss } : {}),
      });

      return { ...harness, socket };
    };

    it("서버가 보스 정보를 주면 켜고, 시계 왕복 전에도 젠 계산으로 가운데에 세운다", () => {
      const { controller } = joinWithBoss({ lastKilledAt: null, health: 80, serverAt: SERVER_NOW });
      const snapshot = controller.getSnapshot();

      expect(snapshot.canFightBoss).toBe(true);
      expect(snapshot.selfHealth).toBe(80);
      expect(snapshot.serverClockOffsetMs).toBe(SERVER_NOW - 1_000);
      expect(controller.sampleBoss(1_000)).toMatchObject({
        phase: "idle",
        x: SPACE_BOSS.arena.centerX,
        z: SPACE_BOSS.arena.centerZ,
      });
      expect(controller.sampleBoss(1_000)).toBe(controller.bossState);
      expect(controller.getBossHealth()).toEqual({ health: 3_000, maximumHealth: 3_000 });
      controller.stop();
    });

    it("보스를 모르는 옛 서버면 끄고, 보스 프레임이 와도 무시한다", () => {
      const { controller, socket } = joinWithBoss(null);

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "boss",
        state: bossWire,
        serverAt: SERVER_NOW,
      });
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "hp", health: 10, serverAt: SERVER_NOW });

      expect(controller.getSnapshot().canFightBoss).toBe(false);
      expect(controller.getSnapshot().selfHealth).toBe(SPACE_BOSS_PLAYER.maximumHealth);
      expect(controller.sampleBoss(1_000).phase).toBe("hidden");
      expect(controller.getBossHealth()).toBeNull();
      controller.stop();
    });

    it("싸우는 중의 상태와 피격을 그릴 상태에 반영한다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "boss",
        state: bossWire,
        serverAt: SERVER_NOW,
      });
      expect(controller.sampleBoss(1_000)).toMatchObject({
        phase: "run",
        // 서버 시작 시각을 로컬 축으로 옮긴 값.
        phaseStartedAt: 1_000,
        x: bossWire.x,
      });

      vi.advanceTimersByTime(50);
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "boss-hit",
        from: 1,
        damage: 10,
        health: 2_390,
        serverAt: SERVER_NOW + 50,
      });

      expect(controller.sampleBoss(1_060).lastHitAt).toBe(1_050);
      expect(controller.getBossHealth()?.health).toBe(2_390);
      controller.stop();
    });

    it("맞으면 체력을, 쓰러지면 다시 움직일 수 있는 시각을 알리고 서버가 정한 자리로 옮긴다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });
      const respawned = { ...self, x: 3, z: -2, y: 0.5 };

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "hp",
        health: 65,
        by: "slam",
        serverAt: SERVER_NOW,
      });
      expect(controller.getSnapshot().selfHealth).toBe(65);
      expect(controller.getSnapshot().deadUntil).toBeNull();

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "hp",
        health: 0,
        by: "swipe",
        serverAt: SERVER_NOW,
      });
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "respawn",
        x: respawned.x,
        y: respawned.y,
        z: respawned.z,
        yaw: 0,
        reviveAt: SERVER_NOW + SPACE_BOSS_PLAYER.respawnDelayMs,
        serverAt: SERVER_NOW,
      });
      socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: respawned });

      const snapshot = controller.getSnapshot();

      expect(snapshot.deadUntil).toBe(1_000 + SPACE_BOSS_PLAYER.respawnDelayMs);
      expect(snapshot.selfHealth).toBe(SPACE_BOSS_PLAYER.maximumHealth);
      expect(snapshot.self).toMatchObject({ x: 3, z: -2, y: 0.5 });
      controller.stop();
    });

    it("처치 소식을 받으면 결과를 남기고 보스를 지운다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });
      const ranking = [
        { seat: 1, damage: 1_800 },
        { seat: 0, damage: 1_200 },
      ];

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "boss-dead",
        killedAt: SERVER_NOW + 10,
        lastHitSeat: 1,
        ranking,
        serverAt: SERVER_NOW + 10,
      });

      expect(controller.getSnapshot().bossDefeat).toEqual({
        killedAt: SERVER_NOW + 10,
        lastHitSeat: 1,
        ranking,
      });
      expect(controller.sampleBoss(1_100).phase).toBe("hidden");
      controller.stop();
    });

    it("이번 칸에 이미 잡힌 뒤 들어오면 보스가 없다", () => {
      const { controller } = joinWithBoss({
        lastKilledAt: SERVER_NOW - 60_000,
        health: 100,
        serverAt: SERVER_NOW,
      });

      expect(controller.getSnapshot().canFightBoss).toBe(true);
      expect(controller.sampleBoss(1_000).phase).toBe("hidden");
      controller.stop();
    });

    it("연결이 끊기면 보스와 쓰러짐 상태를 지운다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });

      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "respawn",
        ...self,
        reviveAt: SERVER_NOW + 3_000,
        serverAt: SERVER_NOW,
      });
      expect(controller.getSnapshot().deadUntil).not.toBeNull();

      socket.emitClose();

      expect(controller.getSnapshot()).toMatchObject({ canFightBoss: false, deadUntil: null });
      expect(controller.sampleBoss(1_000).phase).toBe("hidden");
      controller.stop();
    });

    it("피격 소식을 쌓아 뒀다가 씬이 꺼내 가면 비운다. 숨은 탭에서는 안 쌓는다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });
      const hit = (from: number, damage: number) =>
        socket.receive({
          v: SPACE_PROTOCOL_VERSION,
          t: "boss-hit",
          from,
          damage,
          health: 2_000,
          serverAt: SERVER_NOW,
        });

      hit(1, 10);
      hit(0, 10);

      expect(controller.drainBossHits()).toEqual([
        { from: 1, damage: 10 },
        { from: 0, damage: 10 },
      ]);
      expect(controller.drainBossHits()).toEqual([]);

      controller.setVisibility(false);
      hit(1, 10);
      controller.setVisibility(true);

      expect(controller.drainBossHits()).toEqual([]);
      controller.stop();
    });

    it("보스에게 맞은 시각을 남기고, 보낸 위치를 UI 가 읽을 수 있게 한다", () => {
      const { controller, socket } = joinWithBoss({
        lastKilledAt: null,
        health: 100,
        serverAt: SERVER_NOW,
      });

      expect(controller.getSnapshot().selfDamagedAt).toBeNull();

      vi.advanceTimersByTime(250);
      socket.receive({
        v: SPACE_PROTOCOL_VERSION,
        t: "hp",
        health: 80,
        by: "swipe",
        serverAt: SERVER_NOW,
      });
      controller.publishMovement(movement(30));

      expect(controller.getSnapshot().selfDamagedAt).toBe(1_250);
      expect(controller.getSelfPosition()).toMatchObject({ x: 30, z: 0 });
      controller.stop();
    });
  });
});
