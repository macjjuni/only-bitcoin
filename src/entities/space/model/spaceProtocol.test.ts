import { describe, expect, it } from "vitest";
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
    // 벙커 시절 버전. `y` 의 의미가 달라 호환되지 않으므로 거절해야 한다.
    { v: 1, t: "full" },
  ])("좌석 중복·상한·잘못된 서버 payload를 거절한다", (frame) => {
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toBeNull();
  });
});

describe("모델 선택 전 버전과의 호환", () => {
  it("modelIndex 없는 join 을 받아들인다", () => {
    // 프런트가 먼저 배포되기 전의 클라이언트는 이 값을 보내지 않는다.
    const frame = { v: SPACE_PROTOCOL_VERSION, t: "join", clientKey, nickname: "비트코인" };

    expect(parseSpaceClientFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("modelIndex 없는 welcome 의 peer 에 기본 모델을 채운다", () => {
    // Worker 가 먼저 배포되기 전의 서버는 이 값을 보내지 않는다. 거절하면
    // 배포 창 동안 접속이 전부 막힌다.
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
    expect(parsed.self.modelIndex).toBe(0);
    expect(parsed.peers[0].modelIndex).toBe(0);
  });

  it("modelIndex 없는 peer 에도 기본 모델을 채운다", () => {
    const { modelIndex: _omitted, ...peerWithoutModel } = createPeer(3);
    const parsed = parseSpaceServerFrame(
      JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: peerWithoutModel }),
    );

    if (parsed?.t !== "peer") {
      throw new Error("peer 프레임이 아닙니다.");
    }
    expect(parsed.peer.modelIndex).toBe(0);
  });

  it("범위를 벗어난 modelIndex 는 거절한다", () => {
    // 관용은 "없는 것" 까지다. 모르는 번호는 아바타를 못 그린다.
    const parsed = parseSpaceServerFrame(
      JSON.stringify({
        v: SPACE_PROTOCOL_VERSION,
        t: "peer",
        peer: { ...createPeer(0), modelIndex: 99 },
      }),
    );

    expect(parsed).toBeNull();
  });
});
