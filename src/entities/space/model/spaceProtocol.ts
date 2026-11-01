import type { PlayerTransform, RemotePlayer } from "./playerState";
import { SPACE_MAX_JUMP_HEIGHT, SPACE_MAX_OCCUPANTS } from "./spaceWorld";

export const SPACE_PROTOCOL_VERSION = 1;
export const SPACE_NETWORK_INTERVAL_MS = 100;
export const SPACE_CHAT_COOLDOWN_MS = 3_000;
export const SPACE_CHAT_MAX_GRAPHEMES = 100;
/** 닉네임 변경 간격. 자주 바꾸면 다른 사람이 누가 누군지 못 따라간다. */
export const SPACE_NICKNAME_COOLDOWN_MS = 10_000;

export interface SpaceMotion extends PlayerTransform {
  seat: number;
  isRunning: boolean;
}

export interface SpacePeer extends RemotePlayer {
  isRunning: boolean;
}

export interface SpaceChatMessage {
  id: string;
  rid: string;
  seat: number;
  nickname: string;
  body: string;
  createdAt: number;
}

export interface SpaceMotionSnapshot {
  timestamp: number;
  /** 서버는 변경된 좌석만 보낼 수 있다. 누락된 좌석은 퇴장이 아니다. */
  players: SpaceMotion[];
}

export type SpaceClientFrame =
  | { v: 1; t: "join"; clientKey: string; nickname: string }
  | { v: 1; t: "move"; x: number; y: number; z: number; yaw: number; isRunning: boolean }
  | { v: 1; t: "say"; rid: string; body: string }
  | { v: 1; t: "nick"; rid: string; nickname: string };

export type SpaceServerFrame =
  | { v: 1; t: "welcome"; self: SpacePeer; peers: SpacePeer[] }
  | { v: 1; t: "peer"; peer: SpacePeer }
  | { v: 1; t: "leave"; seat: number }
  | { v: 1; t: "say"; message: SpaceChatMessage }
  | { v: 1; t: "error"; code: string; message: string; rid?: string }
  | { v: 1; t: "full" };

const CLIENT_FRAME_MAX_BYTES = 8 * 1024;
const SERVER_FRAME_MAX_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const textEncoder = new TextEncoder();

// region [Privates]
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isBoundedString = (value: unknown, maximumLength: number): value is string => {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximumLength;
};

const isUuid = (value: unknown): value is string => {
  return typeof value === "string" && UUID_PATTERN.test(value);
};

const isSeat = (value: unknown): value is number => {
  return (
    isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value < SPACE_MAX_OCCUPANTS
  );
};

const isTransform = (value: Record<string, unknown>): boolean => {
  return (
    isFiniteNumber(value.x) &&
    value.x >= -327.68 &&
    value.x <= 327.67 &&
    isFiniteNumber(value.z) &&
    value.z >= -327.68 &&
    value.z <= 327.67 &&
    // 바닥은 평평하다. 점프로 닿을 수 있는 높이만 허용한다.
    isFiniteNumber(value.y) &&
    value.y >= 0 &&
    value.y <= SPACE_MAX_JUMP_HEIGHT &&
    isFiniteNumber(value.yaw)
  );
};

const isPeerArray = (value: unknown): value is SpacePeer[] => {
  if (!Array.isArray(value) || value.length > SPACE_MAX_OCCUPANTS || !value.every(isSpacePeer)) {
    return false;
  }

  return new Set(value.map((peer) => peer.seat)).size === value.length;
};

const isChatMessage = (value: unknown): value is SpaceChatMessage => {
  return (
    isRecord(value) &&
    isBoundedString(value.id, 128) &&
    isUuid(value.rid) &&
    isSeat(value.seat) &&
    isBoundedString(value.nickname, 128) &&
    isBoundedString(value.body, CLIENT_FRAME_MAX_BYTES) &&
    isFiniteNumber(value.createdAt) &&
    Number.isSafeInteger(value.createdAt) &&
    value.createdAt >= 0
  );
};

const parsePayload = (rawPayload: string, maximumBytes: number): Record<string, unknown> | null => {
  if (
    typeof rawPayload !== "string" ||
    rawPayload.length > maximumBytes ||
    textEncoder.encode(rawPayload).byteLength > maximumBytes
  ) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(rawPayload);

    return isRecord(payload) && payload.v === SPACE_PROTOCOL_VERSION ? payload : null;
  } catch {
    return null;
  }
};
// endregion

/** 같은 엔티티의 바이너리 경계에서도 공유하는 런타임 검증이다. */
export const isSpaceMotion = (value: unknown): value is SpaceMotion => {
  return (
    isRecord(value) &&
    isSeat(value.seat) &&
    isTransform(value) &&
    typeof value.isRunning === "boolean"
  );
};

export const isSpacePeer = (value: unknown): value is SpacePeer => {
  return (
    isSpaceMotion(value) &&
    isRecord(value) &&
    isBoundedString(value.nickname, 128) &&
    isFiniteNumber(value.colorIndex) &&
    Number.isInteger(value.colorIndex) &&
    value.colorIndex >= 0 &&
    value.colorIndex <= 255
  );
};

/** 텍스트 정책·권한 검사는 서버에 맡기고 프레임의 구조와 수치 범위를 검증한다. */
export const parseSpaceClientFrame = (rawPayload: string): SpaceClientFrame | null => {
  const payload = parsePayload(rawPayload, CLIENT_FRAME_MAX_BYTES);

  if (!payload) {
    return null;
  }

  switch (payload.t) {
    case "join":
      return typeof payload.clientKey === "string" &&
        CLIENT_KEY_PATTERN.test(payload.clientKey) &&
        isBoundedString(payload.nickname, 128)
        ? (payload as SpaceClientFrame)
        : null;
    case "move":
      return isTransform(payload) && typeof payload.isRunning === "boolean"
        ? (payload as SpaceClientFrame)
        : null;
    case "say":
      return isUuid(payload.rid) && isBoundedString(payload.body, CLIENT_FRAME_MAX_BYTES)
        ? (payload as SpaceClientFrame)
        : null;
    case "nick":
      return isUuid(payload.rid) && isBoundedString(payload.nickname, 128)
        ? (payload as SpaceClientFrame)
        : null;
    default:
      return null;
  }
};

export const parseSpaceServerFrame = (rawPayload: string): SpaceServerFrame | null => {
  const payload = parsePayload(rawPayload, SERVER_FRAME_MAX_BYTES);

  if (!payload) {
    return null;
  }

  switch (payload.t) {
    case "welcome": {
      const selfPeer = payload.self;
      return isSpacePeer(selfPeer) &&
        isPeerArray(payload.peers) &&
        payload.peers.length < SPACE_MAX_OCCUPANTS &&
        payload.peers.every((peer) => peer.seat !== selfPeer.seat)
        ? (payload as SpaceServerFrame)
        : null;
    }
    case "peer":
      return isSpacePeer(payload.peer) ? (payload as SpaceServerFrame) : null;
    case "leave":
      return isSeat(payload.seat) ? (payload as SpaceServerFrame) : null;
    case "say":
      return isChatMessage(payload.message) ? (payload as SpaceServerFrame) : null;
    case "error":
      return isBoundedString(payload.code, 128) &&
        isBoundedString(payload.message, 1024) &&
        (payload.rid === undefined || isUuid(payload.rid))
        ? (payload as SpaceServerFrame)
        : null;
    case "full":
      return payload as SpaceServerFrame;
    default:
      return null;
  }
};
