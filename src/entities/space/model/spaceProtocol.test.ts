import { describe, expect, it } from "vitest";
import {
  resolveAvatarModel,
  SPACE_AVATAR_MODELS,
  SPACE_DEFAULT_AVATAR_MODEL_INDEX,
} from "./avatarModel";
import {
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_PROTOCOL_VERSION,
  type SpacePeer,
} from "./spaceProtocol";

const requestId = "550e8400-e29b-41d4-a716-446655440000";
const clientKey = "abcdefghijklmnopqrstuvwxyz0123456789_-";
const createPeer = (seat = 0): SpacePeer => ({
  seat,
  nickname: "익명",
  colorIndex: seat % 12,
  modelIndex: 0,
  x: 0,
  z: 0,
  y: 0,
  yaw: 0,
  isRunning: false,
});

describe("parseSpaceClientFrame", () => {
  it("공격 식별자와 시각을 검증하고 옛 공격 형식도 허용함", () => {
    const frame = {
      v: SPACE_PROTOCOL_VERSION,
      t: "kick",
      target: 1,
      id: requestId,
      startedAt: 1000,
    };
    expect(parseSpaceClientFrame(JSON.stringify(frame))).toEqual(frame);
    for (const changes of [
      { id: "bad" },
      { startedAt: -1 },
      { startedAt: 1.5 },
      { startedAt: null },
      { id: undefined },
    ]) {
      expect(parseSpaceClientFrame(JSON.stringify({ ...frame, ...changes }))).toBeNull();
    }
    expect(
      parseSpaceClientFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "kick", target: 1 })),
    ).not.toBeNull();
  });
  it.each([
    { v: SPACE_PROTOCOL_VERSION, t: "join", clientKey, nickname: "비트코인", modelIndex: 1 },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      x: -26.12,
      z: 16,
      y: 0,
      yaw: -Math.PI,
      isRunning: true,
    },
    { v: SPACE_PROTOCOL_VERSION, t: "say", rid: requestId, body: "안녕하세요" },
  ])("지원하는 $t 프레임을 검증한다", (frame) => {
    expect(parseSpaceClientFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it.each([
    "{",
    "null",
    "[]",
    '{"v":2,"t":"move","x":0,"z":0,"yaw":0,"isRunning":false}',
    '{"v":1,"t":"move","x":1e309,"z":0,"yaw":0,"isRunning":false}',
    '{"v":1,"t":"move","x":0,"z":0,"yaw":null,"isRunning":false}',
    JSON.stringify({
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      x: 327.68,
      z: 0,
      y: 0,
      yaw: 0,
      isRunning: false,
    }),
    JSON.stringify({
      v: SPACE_PROTOCOL_VERSION,
      t: "move",
      x: 0,
      z: 0,
      y: 0,
      yaw: 0,
      isRunning: 1,
    }),
    JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "say", rid: "invalid", body: "안녕하세요" }),
    JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "say", rid: requestId, body: "   " }),
    JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "join", clientKey: "short", nickname: "익명" }),
    JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "join", clientKey, nickname: "" }),
    JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "unknown" }),
  ])("잘못된 구조·버전·수치·요청 식별자를 거절한다: %s", (payload) => {
    expect(parseSpaceClientFrame(payload)).toBeNull();
  });

  it("UTF-8 바이트 상한을 적용하고 텍스트 정규화는 서버에 맡긴다", () => {
    expect(
      parseSpaceClientFrame(
        JSON.stringify({
          v: SPACE_PROTOCOL_VERSION,
          t: "say",
          rid: requestId,
          body: "한".repeat(3000),
        }),
      ),
    ).toBeNull();
    expect(
      parseSpaceClientFrame(
        JSON.stringify({
          v: SPACE_PROTOCOL_VERSION,
          t: "say",
          rid: requestId,
          body: "  안녕하세요  ",
        }),
      ),
    ).toMatchObject({ body: "  안녕하세요  " });
  });
});

describe("parseSpaceServerFrame", () => {
  it("공격 시간 필드는 모두 함께 있어야 하고 시작은 서버 전송보다 미래일 수 없음", () => {
    const frame = {
      v: SPACE_PROTOCOL_VERSION,
      t: "kick",
      from: 0,
      to: 1,
      dirX: 1,
      dirZ: 0,
      id: requestId,
      startedAt: 1000,
      serverAt: 1100,
    };
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
    for (const changes of [
      { id: undefined },
      { serverAt: undefined },
      { startedAt: undefined },
      { startedAt: 1200 },
      { serverAt: -1 },
    ]) {
      expect(parseSpaceServerFrame(JSON.stringify({ ...frame, ...changes }))).toBeNull();
    }
  });
  it.each([
    { v: SPACE_PROTOCOL_VERSION, t: "welcome", self: createPeer(), peers: [createPeer(1)] },
    { v: SPACE_PROTOCOL_VERSION, t: "peer", peer: createPeer(49) },
    { v: SPACE_PROTOCOL_VERSION, t: "leave", seat: 49 },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      message: {
        id: "message-id",
        rid: requestId,
        seat: 1,
        nickname: "익명",
        body: "안녕",
        createdAt: 1234,
      },
    },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "error",
      code: "COOLDOWN",
      message: "잠시 후 다시 보내주세요.",
      rid: requestId,
    },
    { v: SPACE_PROTOCOL_VERSION, t: "full" },
  ])("지원하는 $t 프레임을 검증한다", (frame) => {
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("본인을 제외한 49명까지 입장 명단을 허용한다", () => {
    const frame = {
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self: createPeer(),
      peers: Array.from({ length: 49 }, (_, index) => createPeer(index + 1)),
    };
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it.each([
    { v: SPACE_PROTOCOL_VERSION, t: "welcome", self: createPeer(), peers: [createPeer()] },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self: createPeer(),
      peers: [createPeer(1), createPeer(1)],
    },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "welcome",
      self: createPeer(),
      peers: Array.from({ length: 50 }, (_, index) => createPeer(index)),
    },
    { v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...createPeer(), colorIndex: 256 } },
    { v: SPACE_PROTOCOL_VERSION, t: "peer", peer: { ...createPeer(), isRunning: undefined } },
    { v: SPACE_PROTOCOL_VERSION, t: "leave", seat: 50 },
    { v: SPACE_PROTOCOL_VERSION, t: "leave", seat: 0.5 },
    { v: SPACE_PROTOCOL_VERSION, t: "error", code: "ERROR", message: "오류", rid: "invalid" },
    {
      v: SPACE_PROTOCOL_VERSION,
      t: "say",
      message: {
        id: "message-id",
        rid: requestId,
        seat: 0,
        nickname: "익명",
        body: "안녕",
        createdAt: -1,
      },
    },
    // 벙커 시절 버전. `y` 의미가 달라 호환이 안 돼서 거절해야 함.
    { v: 1, t: "full" },
  ])("좌석 중복·상한·잘못된 서버 payload를 거절한다", (frame) => {
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toBeNull();
  });
});

describe("모델 선택 전 버전과의 호환", () => {
  it("modelIndex 없는 join 을 받아들인다", () => {
    // 프런트가 먼저 배포되기 전의 클라이언트는 이 값을 안 보냄.
    const frame = { v: SPACE_PROTOCOL_VERSION, t: "join", clientKey, nickname: "비트코인" };

    expect(parseSpaceClientFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("modelIndex 없는 welcome 의 peer 에 기본 모델을 채운다", () => {
    // Worker 가 먼저 배포되기 전의 서버는 이 값을 안 보냄. 거절하면
    // 배포 창 동안 접속이 전부 막힘.
    const { modelIndex: _self, ...selfWithoutModel } = createPeer(0);
    const { modelIndex: _other, ...peerWithoutModel } = createPeer(1);
    const parsed = parseSpaceServerFrame(
      JSON.stringify({
        v: SPACE_PROTOCOL_VERSION,
        t: "welcome",
        self: selfWithoutModel,
        peers: [peerWithoutModel],
      }),
    );

    expect(parsed).not.toBeNull();
    if (parsed?.t !== "welcome") {
      throw new Error("welcome 프레임이 아닙니다.");
    }
    expect(parsed.self.modelIndex).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
    expect(parsed.peers[0].modelIndex).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
  });

  it("modelIndex 없는 peer 에도 기본 모델을 채운다", () => {
    const { modelIndex: _omitted, ...peerWithoutModel } = createPeer(3);
    const parsed = parseSpaceServerFrame(
      JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: peerWithoutModel }),
    );

    if (parsed?.t !== "peer") {
      throw new Error("peer 프레임이 아닙니다.");
    }
    expect(parsed.peer.modelIndex).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
  });

  it("목록에 없는 새 modelIndex 도 받고 기본 모델로 그림", () => {
    // 모델을 추가해 배포할 때 새로고침 안 한 탭이 끊기지 않아야 함.
    const parsed = parseSpaceServerFrame(
      JSON.stringify({
        v: SPACE_PROTOCOL_VERSION,
        t: "peer",
        peer: { ...createPeer(0), modelIndex: 99 },
      }),
    );

    if (parsed?.t !== "peer") {
      throw new Error("peer 프레임이어야 함");
    }
    expect(parsed.peer.modelIndex).toBe(99);
    expect(resolveAvatarModel(parsed.peer.modelIndex)).toBe(
      SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX],
    );
  });

  it.each([-1, 256, 1.5, "1"])("범위·형식이 틀린 modelIndex(%s)는 거절함", (modelIndex) => {
    const parsed = parseSpaceServerFrame(
      JSON.stringify({
        v: SPACE_PROTOCOL_VERSION,
        t: "peer",
        peer: { ...createPeer(0), modelIndex },
      }),
    );

    expect(parsed).toBeNull();
  });

  describe("발차기 프레임", () => {
    it("대상이 있거나 없는 발차기 요청을 받고 좌석이 틀리면 거절함", () => {
      expect(
        parseSpaceClientFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "kick", target: 3 })),
      ).toEqual({
        v: SPACE_PROTOCOL_VERSION,
        t: "kick",
        target: 3,
      });
      expect(
        parseSpaceClientFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "kick" })),
      ).not.toBeNull();
      expect(
        parseSpaceClientFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "kick", target: -1 })),
      ).toBeNull();
    });

    it("입장 요청의 기능 목록은 짧은 문자열 배열만 받음", () => {
      const join = { v: SPACE_PROTOCOL_VERSION, t: "join", clientKey, nickname: "비트코인" };

      expect(parseSpaceClientFrame(JSON.stringify({ ...join, features: ["kick"] }))).not.toBeNull();
      expect(parseSpaceClientFrame(JSON.stringify({ ...join, features: "kick" }))).toBeNull();
      expect(
        parseSpaceClientFrame(JSON.stringify({ ...join, features: ["x".repeat(33)] })),
      ).toBeNull();
    });

    it("발차기 이벤트는 좌석·방향 범위를 보고 자기 자신을 찬 건 거절함", () => {
      const kick = { v: SPACE_PROTOCOL_VERSION, t: "kick", from: 1, to: 2, dirX: 0.6, dirZ: 0.8 };

      expect(parseSpaceServerFrame(JSON.stringify(kick))).toEqual(kick);
      expect(parseSpaceServerFrame(JSON.stringify({ ...kick, to: undefined }))).not.toBeNull();
      expect(parseSpaceServerFrame(JSON.stringify({ ...kick, to: 1 }))).toBeNull();
      expect(parseSpaceServerFrame(JSON.stringify({ ...kick, dirX: 3 }))).toBeNull();
      expect(parseSpaceServerFrame(JSON.stringify({ ...kick, from: 99 }))).toBeNull();
    });

    it("모르는 종류는 끊지 않고 ignored 로 읽음. 아는 종류가 깨진 건 그대로 거절함", () => {
      expect(
        parseSpaceServerFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "dance" })),
      ).toEqual({
        v: SPACE_PROTOCOL_VERSION,
        t: "ignored",
      });
      expect(
        parseSpaceServerFrame(JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat: -1 })),
      ).toBeNull();
    });
  });
});
