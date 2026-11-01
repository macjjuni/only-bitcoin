import { describe, expect, it } from "vitest";
import { parseSpaceClientFrame, parseSpaceServerFrame, type SpacePeer } from "./spaceProtocol";

const requestId = "550e8400-e29b-41d4-a716-446655440000";
const clientKey = "abcdefghijklmnopqrstuvwxyz0123456789_-";
const createPeer = (seat = 0): SpacePeer => ({
  seat,
  nickname: "익명",
  colorIndex: seat % 12,
  x: 0,
  z: 0,
  y: 0, yaw: 0,
  isRunning: false,
});

describe("parseSpaceClientFrame", () => {
  it.each([
    { v: 1, t: "join", clientKey, nickname: "비트코인" },
    { v: 1, t: "move", x: -26.12, z: 16, y: 0, yaw: -Math.PI, isRunning: true },
    { v: 1, t: "say", rid: requestId, body: "안녕하세요" },
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
    JSON.stringify({ v: 1, t: "move", x: 327.68, z: 0, y: 0, yaw: 0, isRunning: false }),
    JSON.stringify({ v: 1, t: "move", x: 0, z: 0, y: 0, yaw: 0, isRunning: 1 }),
    JSON.stringify({ v: 1, t: "say", rid: "invalid", body: "안녕하세요" }),
    JSON.stringify({ v: 1, t: "say", rid: requestId, body: "   " }),
    JSON.stringify({ v: 1, t: "join", clientKey: "short", nickname: "익명" }),
    JSON.stringify({ v: 1, t: "join", clientKey, nickname: "" }),
    JSON.stringify({ v: 1, t: "unknown" }),
  ])("잘못된 구조·버전·수치·요청 식별자를 거절한다: %s", (payload) => {
    expect(parseSpaceClientFrame(payload)).toBeNull();
  });

  it("UTF-8 바이트 상한을 적용하고 텍스트 정규화는 서버에 맡긴다", () => {
    expect(
      parseSpaceClientFrame(
        JSON.stringify({
          v: 1,
          t: "say",
          rid: requestId,
          body: "한".repeat(3000),
        }),
      ),
    ).toBeNull();
    expect(
      parseSpaceClientFrame(
        JSON.stringify({
          v: 1,
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
    { v: 1, t: "welcome", self: createPeer(), peers: [createPeer(1)] },
    { v: 1, t: "peer", peer: createPeer(49) },
    { v: 1, t: "leave", seat: 49 },
    {
      v: 1,
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
    { v: 1, t: "error", code: "COOLDOWN", message: "잠시 후 다시 보내주세요.", rid: requestId },
    { v: 1, t: "full" },
  ])("지원하는 $t 프레임을 검증한다", (frame) => {
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it("본인을 제외한 49명까지 입장 명단을 허용한다", () => {
    const frame = {
      v: 1,
      t: "welcome",
      self: createPeer(),
      peers: Array.from({ length: 49 }, (_, index) => createPeer(index + 1)),
    };
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toEqual(frame);
  });

  it.each([
    { v: 1, t: "welcome", self: createPeer(), peers: [createPeer()] },
    { v: 1, t: "welcome", self: createPeer(), peers: [createPeer(1), createPeer(1)] },
    {
      v: 1,
      t: "welcome",
      self: createPeer(),
      peers: Array.from({ length: 50 }, (_, index) => createPeer(index)),
    },
    { v: 1, t: "peer", peer: { ...createPeer(), colorIndex: 256 } },
    { v: 1, t: "peer", peer: { ...createPeer(), isRunning: undefined } },
    { v: 1, t: "leave", seat: 50 },
    { v: 1, t: "leave", seat: 0.5 },
    { v: 1, t: "error", code: "ERROR", message: "오류", rid: "invalid" },
    {
      v: 1,
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
    { v: 2, t: "full" },
  ])("좌석 중복·상한·잘못된 서버 payload를 거절한다", (frame) => {
    expect(parseSpaceServerFrame(JSON.stringify(frame))).toBeNull();
  });
});
