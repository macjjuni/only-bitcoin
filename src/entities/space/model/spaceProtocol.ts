import { isAvatarModelIndex, SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "./avatarModel";
import type { PlayerTransform, RemotePlayer } from "./playerState";
import { SPACE_MAX_ALTITUDE, SPACE_MAX_OCCUPANTS } from "./spaceWorld";

/**
 * 프레임 버전.
 *
 * 맵이 벙커에서 섬으로 바뀌면서 **`y` 의 의미와 범위가 달라졌음.** 벙커의
 * `y` 는 평평한 바닥 위 점프 높이(0 ~ 2.5 m)였고 스냅샷에 1바이트로 담겼음.
 * 섬의 `y` 는 층이 다른 지면의 절대 높이(0 ~ 36 m)라 2바이트가 필요함.
 *
 * 1 을 그대로 두면 옛 서버가 보낸 "점프 높이 2.0" 을 새 클라이언트가 "해발
 * 2.0 m" 로 읽어 광장 아래에 선 사람이 생김. 호환이 안 되는 변경이라
 * 버전을 올려 **서로를 거절하게** 함. 배포는 원자적이지 않아 워커를 먼저
 * 올리고 웹을 올림.
 */
export const SPACE_PROTOCOL_VERSION = 2;
export const SPACE_NETWORK_INTERVAL_MS = 100;
export const SPACE_CHAT_COOLDOWN_MS = 3_000;
export const SPACE_CHAT_MAX_GRAPHEMES = 100;
/** 입장할 때 서버가 함께 내려주는 최근 대화 수. */
export const SPACE_CHAT_HISTORY_COUNT = 50;
/** 닉네임 변경 간격. 자주 바꾸면 다른 사람이 누가 누군지 못 따라감. */
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
  /** 서버는 변경된 좌석만 보낼 수 있음. 빠진 좌석은 퇴장이 아님. */
  players: SpaceMotion[];
}

/**
 * 프레임의 버전 칸.
 *
 * 숫자를 직접 안 씀. 전에는 양쪽 유니온과 호출부 40여 곳이 `v: 1` 을
 * 각자 들고 있어서 버전을 올리려면 전부 찾아 고쳐야 했음.
 */
type SpaceProtocolVersion = typeof SPACE_PROTOCOL_VERSION;

export type SpaceClientFrame =
  | {
      v: SpaceProtocolVersion;
      t: "join";
      clientKey: string;
      nickname: string;
      modelIndex?: number;
    }
  | {
      v: SpaceProtocolVersion;
      t: "move";
      x: number;
      y: number;
      z: number;
      yaw: number;
      isRunning: boolean;
    }
  | { v: SpaceProtocolVersion; t: "say"; rid: string; body: string }
  | { v: SpaceProtocolVersion; t: "nick"; rid: string; nickname: string }
  | { v: SpaceProtocolVersion; t: "model"; rid: string; modelIndex: number };

export type SpaceServerFrame =
  | {
      v: SpaceProtocolVersion;
      t: "welcome";
      self: SpacePeer;
      peers: SpacePeer[];
      /** 기록을 모르는 옛 서버는 안 보냄. 없으면 빈 기록으로 읽음. */
      messages?: SpaceChatMessage[];
    }
  | { v: SpaceProtocolVersion; t: "peer"; peer: SpacePeer }
  | { v: SpaceProtocolVersion; t: "leave"; seat: number }
  | { v: SpaceProtocolVersion; t: "say"; message: SpaceChatMessage }
  | { v: SpaceProtocolVersion; t: "error"; code: string; message: string; rid?: string }
  | { v: SpaceProtocolVersion; t: "full" };

const CLIENT_FRAME_MAX_BYTES = 8 * 1024;
/**
 * 클라이언트가 받아주는 서버 프레임 최대 크기. 넘으면 프레임을 버림.
 *
 * 서버도 이 값을 봄. 입장 프레임에 대화 기록을 담다가 넘기면 입장이 끝나지 않음.
 */
export const SPACE_SERVER_FRAME_MAX_BYTES = 64 * 1024;
const SERVER_FRAME_MAX_BYTES = SPACE_SERVER_FRAME_MAX_BYTES;
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
    // 섬은 층이 여러 개라 `y` 가 절대 높이임. 서버는 지형을 몰라 섬 전체를
    // 덮는 상한만 봄. 층별 판정은 클라이언트 지형 충돌이 맡음.
    isFiniteNumber(value.y) &&
    value.y >= 0 &&
    value.y <= SPACE_MAX_ALTITUDE &&
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

const isChatHistory = (value: unknown): value is SpaceChatMessage[] => {
  return (
    Array.isArray(value) && value.length <= SPACE_CHAT_HISTORY_COUNT && value.every(isChatMessage)
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

/** 같은 엔티티의 바이너리 경계에서도 공유하는 런타임 검증. */
export const isSpaceMotion = (value: unknown): value is SpaceMotion => {
  return (
    isRecord(value) &&
    isSeat(value.seat) &&
    isTransform(value) &&
    typeof value.isRunning === "boolean"
  );
};

/**
 * 서버가 보낸 모델 번호. 목록 길이가 아니라 범위만 봄.
 *
 * 목록 길이로 막으면 모델을 추가해 배포할 때 새로고침 안 한 탭이 새 번호를 받는
 * 순간 프레임 전체를 버리고 연결을 끊음. 모르는 번호는 `resolveAvatarModel` 이
 * 기본 모델로 그리므로 받아 둠. 서버가 요청을 검사할 때는 `isAvatarModelIndex` 로
 * 엄격하게 봄.
 */
const isReceivedModelIndex = (value: unknown): boolean => {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value <= 255;
};

export const isSpacePeer = (value: unknown): value is SpacePeer => {
  return (
    isSpaceMotion(value) &&
    isRecord(value) &&
    isBoundedString(value.nickname, 128) &&
    isFiniteNumber(value.colorIndex) &&
    Number.isInteger(value.colorIndex) &&
    value.colorIndex >= 0 &&
    value.colorIndex <= 255 &&
    // 없는 것도 통과시킴. 모델 선택 전에 배포된 서버는 안 보냄.
    (value.modelIndex === undefined || isReceivedModelIndex(value.modelIndex))
  );
};

/** 텍스트 정책·권한 검사는 서버에 맡기고 프레임 구조와 수치 범위만 검증함. */
export const parseSpaceClientFrame = (rawPayload: string): SpaceClientFrame | null => {
  const payload = parsePayload(rawPayload, CLIENT_FRAME_MAX_BYTES);

  if (!payload) {
    return null;
  }

  switch (payload.t) {
    case "join":
      return typeof payload.clientKey === "string" &&
        CLIENT_KEY_PATTERN.test(payload.clientKey) &&
        isBoundedString(payload.nickname, 128) &&
        // 모델 선택 전에 배포된 클라이언트는 이 값을 안 보냄.
        (payload.modelIndex === undefined || isAvatarModelIndex(payload.modelIndex))
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
    case "model":
      return isUuid(payload.rid) && isAvatarModelIndex(payload.modelIndex)
        ? (payload as SpaceClientFrame)
        : null;
    default:
      return null;
  }
};

/**
 * 모델 번호가 빠진 peer 에 기본값을 채움.
 *
 * 배포가 원자적이지 않아 **모델 선택을 모르는 서버**가 잠시 살아 있을 수 있음.
 * 그 서버의 `welcome`·`peer` 를 거절하면 그 사이 접속이 전부 막힘. 빠진 값은
 * 기본 모델로 읽어 아바타를 그리는 쪽이 나음.
 */
const withDefaultModel = (peer: SpacePeer): SpacePeer => {
  return peer.modelIndex === undefined
    ? { ...peer, modelIndex: SPACE_DEFAULT_AVATAR_MODEL_INDEX }
    : peer;
};

export const parseSpaceServerFrame = (rawPayload: string): SpaceServerFrame | null => {
  const payload = parsePayload(rawPayload, SERVER_FRAME_MAX_BYTES);

  if (!payload) {
    return null;
  }

  switch (payload.t) {
    case "welcome": {
      const selfPeer = payload.self;
      const peers = payload.peers;
      const messages = payload.messages;

      if (
        !isSpacePeer(selfPeer) ||
        !isPeerArray(peers) ||
        peers.length >= SPACE_MAX_OCCUPANTS ||
        peers.some((peer) => peer.seat === selfPeer.seat) ||
        (messages !== undefined && !isChatHistory(messages))
      ) {
        return null;
      }

      return {
        ...payload,
        self: withDefaultModel(selfPeer),
        peers: peers.map(withDefaultModel),
      } as SpaceServerFrame;
    }
    case "peer":
      return isSpacePeer(payload.peer)
        ? ({ ...payload, peer: withDefaultModel(payload.peer) } as SpaceServerFrame)
        : null;
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
