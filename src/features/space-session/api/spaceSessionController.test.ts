import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeSpaceSnapshot,
  type LocalPlayerState,
  SPACE_PROTOCOL_VERSION,
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

  const welcome = (socket = sockets[sockets.length - 1], peers: SpacePeer[] = []) => {
    socket.open();
    socket.receive({ v: SPACE_PROTOCOL_VERSION, t: "welcome", self, peers });
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
      { v: SPACE_PROTOCOL_VERSION, t: "join", ...identity, modelIndex: 0 },
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

  it("잠깐 멈췄다 다시 움직여도 전송 간격이 서버 최소 간격(50ms)보다 붙지 않음", () => {
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
});
