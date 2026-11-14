import { isAvatarModelIndex, SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "./avatarModel";
import type { SpaceBossAttack, SpaceBossPhase, SpaceBossSpinSegment } from "./boss";
import {
  isSpaceHallBgmState,
  isSpaceHallBgmTrack,
  type SpaceHallBgmState,
  type SpaceHallBgmTrack,
} from "./hallBgm";
import type { PlayerTransform, RemotePlayer } from "./playerState";
import {
  isSpaceCelebration,
  isSpaceMarketState,
  type SpaceCelebration,
  type SpaceMarketState,
} from "./spaceMarket";
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
export const SPACE_CHAT_COOLDOWN_MS = 2_000;
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
 * 서버가 보내는 보스 상태.
 *
 * 시각은 전부 **서버 시각**(ms)임. 받는 쪽이 `clock` 으로 잰 차이만큼 옮겨 씀.
 * "지금 몇 초째" 가 아니라 시작 시각이라 중간에 들어온 사람도 모션을 이어서 봄.
 */
/** 처치 순위 한 줄. */
export interface SpaceBossRankingEntry {
  /** 그 사람이 마지막으로 때릴 때 앉아 있던 좌석. */
  seat: number;
  damage: number;
  /** 마지막으로 때릴 때의 이름. 옛 서버는 안 보내서 그때는 좌석으로 이름을 찾음. */
  nickname?: string;
}

export interface SpaceBossWire {
  phase: SpaceBossPhase;
  attack: SpaceBossAttack | null;
  phaseStartedAt: number;
  x: number;
  z: number;
  yaw: number;
  /** 공격을 시작한 자리. 바닥 예고를 여기 박아 둠. */
  attackOriginX: number;
  attackOriginZ: number;
  speed: number;
  health: number;
  maximumHealth: number;
  /** 쫓고 있는 좌석. 없으면 `null`. */
  targetSeat: number | null;
  /** 마지막으로 맞은 시각. 한 번도 안 맞았으면 없음. */
  lastHitAt?: number;
  /**
   * 회전 공격의 이동 구간. 지금 구간과, 정해졌으면 다음 구간이 옴.
   *
   * 있으면 `x`·`z` 대신 이걸로 그림. 옛 서버는 안 보내고 옛 클라이언트는 안 읽음.
   */
  spinPath?: SpaceBossSpinSegment[];
}

/** 입장할 때 받는 보스 정보. */
export interface SpaceBossWelcome {
  /** 마지막 처치 시각. 이걸로 젠 시각을 스스로 계산함. 한 번도 안 잡았으면 `null`. */
  lastKilledAt: number | null;
  /** 싸우는 중일 때만 옴. 없으면 가운데 서 있는 것으로 그림. */
  state?: SpaceBossWire;
  /** 내 체력. */
  health: number;
  serverAt: number;
}

/**
 * 프레임의 버전 칸.
 *
 * 숫자를 직접 안 씀. 전에는 양쪽 유니온과 호출부 40여 곳이 `v: 1` 을
 * 각자 들고 있어서 버전을 올리려면 전부 찾아 고쳐야 했음.
 */
type SpaceProtocolVersion = typeof SPACE_PROTOCOL_VERSION;

export type SpaceClientFrame =
  | { v: SpaceProtocolVersion; t: "clock"; sentAt: number }
  | { v: SpaceProtocolVersion; t: "celebrate" }
  /** 홀 배경음악을 바꿔 달라고 함. 바리스타 NPC 메뉴에서 보냄. */
  | { v: SpaceProtocolVersion; t: "hall-bgm"; track: SpaceHallBgmTrack }
  | {
      v: SpaceProtocolVersion;
      t: "join";
      clientKey: string;
      nickname: string;
      modelIndex?: number;
      /** 이 클라이언트가 아는 기능. 서버는 아는 쪽에만 그 기능 프레임을 보냄. */
      features?: string[];
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
  | { v: SpaceProtocolVersion; t: "model"; rid: string; modelIndex: number }
  /** 연출만 퍼짐. `target` 은 유저끼리 맞던 때의 옛 클라이언트만 보내고 서버는 안 봄. */
  | { v: SpaceProtocolVersion; t: "kick"; target?: number; id?: string; startedAt?: number };

export type SpaceServerFrame =
  | { v: SpaceProtocolVersion; t: "clock"; sentAt: number; serverAt: number }
  | { v: SpaceProtocolVersion; t: "market"; state: SpaceMarketState; serverAt: number }
  | { v: SpaceProtocolVersion; t: "celebrate"; event: SpaceCelebration; serverAt: number }
  | {
      v: SpaceProtocolVersion;
      t: "welcome";
      self: SpacePeer;
      peers: SpacePeer[];
      /** 기록을 모르는 옛 서버는 안 보냄. 없으면 빈 기록으로 읽음. */
      messages?: SpaceChatMessage[];
      /** 서버가 지원하는 기능. 없으면 발차기 버튼을 숨김. */
      features?: string[];
      /** 보스를 아는 클라이언트에만 옴. */
      boss?: SpaceBossWelcome;
      /** 누가 홀 배경음악을 바꿔 둔 적이 있고, 그 기능을 아는 클라이언트에만 옴. */
      hallBgm?: SpaceHallBgmState;
    }
  /** 누가 홀 배경음악을 바꿈. 그 기능을 아는 클라이언트에만 옴. */
  | { v: SpaceProtocolVersion; t: "hall-bgm"; state: SpaceHallBgmState; serverAt: number }
  | { v: SpaceProtocolVersion; t: "peer"; peer: SpacePeer }
  | { v: SpaceProtocolVersion; t: "leave"; seat: number }
  | { v: SpaceProtocolVersion; t: "say"; message: SpaceChatMessage }
  | { v: SpaceProtocolVersion; t: "error"; code: string; message: string; rid?: string }
  | { v: SpaceProtocolVersion; t: "full" }
  /**
   * `from` 이 찼음. 동작만 재생함.
   *
   * `to` 는 유저끼리 맞던 때의 옛 서버만 보내고 안 읽음. `dirX/dirZ` 는 찬 사람이
   * 보는 방향인데 지금은 안 쓰고, 옛 클라이언트가 없으면 프레임을 버려서 계속 보냄.
   */
  | {
      v: SpaceProtocolVersion;
      t: "kick";
      from: number;
      to?: number;
      dirX: number;
      dirZ: number;
      /** 세 필드는 함께 옴. 없으면 시각 동기화를 모르는 옛 서버임. */
      id?: string;
      startedAt?: number;
      serverAt?: number;
    }
  /** 싸우는 동안 매 틱 옴. 싸움이 끝나 쉬러 들어갈 때 마지막으로 한 번 더 옴. */
  | { v: SpaceProtocolVersion; t: "boss"; state: SpaceBossWire; serverAt: number }
  /** `from` 이 보스를 맞힘. 피해 숫자를 띄우는 데 씀. */
  | {
      v: SpaceProtocolVersion;
      t: "boss-hit";
      from: number;
      damage: number;
      health: number;
      serverAt: number;
    }
  /**
   * `seat` 이 보스 공격에 맞음. 맞는 모션과 쓰러지는 모션을 남에게도 보여 주는 데 씀.
   *
   * 체력은 안 실음. 남의 체력은 본인만 앎(`hp`).
   */
  | {
      v: SpaceProtocolVersion;
      t: "player-hit";
      seat: number;
      by: SpaceBossAttack;
      /** 이 공격으로 쓰러졌는지. */
      isFatal: boolean;
      serverAt: number;
    }
  /** 내 체력이 바뀜. `by` 가 있으면 그 공격에 맞은 것임. */
  | { v: SpaceProtocolVersion; t: "hp"; health: number; by?: SpaceBossAttack; serverAt: number }
  /** 내가 쓰러짐. `reviveAt` 까지 사망 화면을 보여 주고 이 좌표에서 다시 시작함. */
  | {
      v: SpaceProtocolVersion;
      t: "respawn";
      x: number;
      y: number;
      z: number;
      yaw: number;
      reviveAt: number;
      serverAt: number;
    }
  /**
   * 보스가 젠 시각이 아닌데 다시 나옴. 개발 서버에서 처치 뒤 바로 다시 불러낼 때만 옴.
   *
   * 받는 쪽은 처치 기록을 지우고 `spawnedAt` 부터 등장 연출을 틂.
   */
  | { v: SpaceProtocolVersion; t: "boss-spawn"; spawnedAt: number; serverAt: number }
  /**
   * 보스를 잡음. 순위는 피해를 많이 준 순서이고 사람 기준으로 쌓은 값임.
   *
   * `nickname` 은 그 사람이 마지막으로 때릴 때의 이름임. 싸우다 나간 사람도 이름이
   * 남고, 그 좌석에 새로 온 사람과 헷갈리지 않음. 옛 서버는 안 보냄.
   */
  | {
      v: SpaceProtocolVersion;
      t: "boss-dead";
      killedAt: number;
      lastHitSeat: number;
      ranking: SpaceBossRankingEntry[];
      serverAt: number;
    }
  /** 이 클라이언트가 모르는 새 종류. 끊지 않고 버림. */
  | { v: SpaceProtocolVersion; t: "ignored" };

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

const isTimestamp = (value: unknown): value is number =>
  isFiniteNumber(value) && Number.isSafeInteger(value) && value >= 0;

const isKickTiming = (payload: Record<string, unknown>): boolean => {
  if (
    payload.id === undefined &&
    payload.startedAt === undefined &&
    payload.serverAt === undefined
  ) {
    return true;
  }
  return (
    isUuid(payload.id) &&
    isTimestamp(payload.startedAt) &&
    isTimestamp(payload.serverAt) &&
    payload.startedAt <= payload.serverAt
  );
};

const BOSS_PHASES: readonly string[] = [
  "hidden",
  "spawn",
  "idle",
  "walk",
  "run",
  "turn",
  "attack",
  "stagger",
  "enrage",
  "dead",
] satisfies SpaceBossPhase[];
const BOSS_ATTACKS: readonly string[] = [
  "swipe",
  "slam",
  "charge",
  "spin",
] satisfies SpaceBossAttack[];
/** 체력·피해로 받아 주는 상한. 수치를 조정해도 걸리지 않게 넉넉히 잡음. */
const MAXIMUM_BOSS_AMOUNT = 10_000_000;

const isBossAttack = (value: unknown): value is SpaceBossAttack => {
  return typeof value === "string" && BOSS_ATTACKS.includes(value);
};

const isAmount = (value: unknown): value is number => {
  return isFiniteNumber(value) && value >= 0 && value <= MAXIMUM_BOSS_AMOUNT;
};

const isSeat = (value: unknown): value is number => {
  return (
    isFiniteNumber(value) && Number.isInteger(value) && value >= 0 && value < SPACE_MAX_OCCUPANTS
  );
};

/** 기능 이름 목록. 이름은 짧은 문자열이고 개수도 제한함. */
const isFeatureList = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) &&
    value.length <= 8 &&
    value.every((feature) => isBoundedString(feature, 32))
  );
};

/** 공격 방향. 서버가 정규화해 보내지만 크기가 1 을 넘지 않는지만 봄. */
const isKickDirection = (x: unknown, z: unknown): boolean => {
  return isFiniteNumber(x) && isFiniteNumber(z) && Math.hypot(x, z) <= 1.001;
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

/** 서버는 구간을 둘까지만 보냄. 여유를 둬서 넷까지 받음. */
const MAXIMUM_SPIN_PATH_LENGTH = 4;

const isBossSpinSegment = (value: unknown): value is SpaceBossSpinSegment => {
  return (
    isRecord(value) &&
    isTimestamp(value.startedAt) &&
    isFiniteNumber(value.fromX) &&
    isFiniteNumber(value.fromZ) &&
    isFiniteNumber(value.toX) &&
    isFiniteNumber(value.toZ)
  );
};

const isBossWire = (value: unknown): value is SpaceBossWire => {
  return (
    isRecord(value) &&
    typeof value.phase === "string" &&
    BOSS_PHASES.includes(value.phase) &&
    (value.attack === null || isBossAttack(value.attack)) &&
    isTimestamp(value.phaseStartedAt) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.z) &&
    isFiniteNumber(value.yaw) &&
    isFiniteNumber(value.attackOriginX) &&
    isFiniteNumber(value.attackOriginZ) &&
    isAmount(value.speed) &&
    isAmount(value.health) &&
    isAmount(value.maximumHealth) &&
    value.maximumHealth > 0 &&
    (value.targetSeat === null || isSeat(value.targetSeat)) &&
    (value.lastHitAt === undefined || isTimestamp(value.lastHitAt)) &&
    (value.spinPath === undefined ||
      (Array.isArray(value.spinPath) &&
        value.spinPath.length <= MAXIMUM_SPIN_PATH_LENGTH &&
        value.spinPath.every(isBossSpinSegment)))
  );
};

const isBossWelcome = (value: unknown): value is SpaceBossWelcome => {
  return (
    isRecord(value) &&
    (value.lastKilledAt === null || isTimestamp(value.lastKilledAt)) &&
    (value.state === undefined || isBossWire(value.state)) &&
    isAmount(value.health) &&
    isTimestamp(value.serverAt)
  );
};

/** 순위에 실린 이름의 길이 상한. 닉네임 규칙보다 넉넉하게 잡아 규칙이 바뀌어도 안 끊김. */
const MAXIMUM_RANKING_NICKNAME_LENGTH = 64;

const isBossRanking = (value: unknown): value is SpaceBossRankingEntry[] => {
  return (
    Array.isArray(value) &&
    value.length <= SPACE_MAX_OCCUPANTS &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        isSeat(entry.seat) &&
        isAmount(entry.damage) &&
        (entry.nickname === undefined ||
          (typeof entry.nickname === "string" &&
            entry.nickname.length <= MAXIMUM_RANKING_NICKNAME_LENGTH)),
    )
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
    case "clock":
      return isFiniteNumber(payload.sentAt) && payload.sentAt >= 0
        ? (payload as SpaceClientFrame)
        : null;
    case "celebrate":
      return payload as SpaceClientFrame;
    case "hall-bgm":
      return isSpaceHallBgmTrack(payload.track) ? (payload as SpaceClientFrame) : null;
    case "join":
      return typeof payload.clientKey === "string" &&
        CLIENT_KEY_PATTERN.test(payload.clientKey) &&
        isBoundedString(payload.nickname, 128) &&
        // 범위만 봄. 목록에 없는 번호로 막으면, 캐릭터를 줄여 배포했을 때 새로고침 안 한
        // 탭(옛 번호를 들고 있음)이 재접속할 때마다 입장을 거절당함. 서버가 기본 모델로 접음.
        (payload.modelIndex === undefined || isReceivedModelIndex(payload.modelIndex)) &&
        (payload.features === undefined || isFeatureList(payload.features))
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
    case "kick":
      return (payload.target === undefined || isSeat(payload.target)) &&
        (payload.id === undefined || isUuid(payload.id)) &&
        (payload.startedAt === undefined || (isUuid(payload.id) && isTimestamp(payload.startedAt)))
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
    case "clock":
      return isFiniteNumber(payload.sentAt) &&
        payload.sentAt >= 0 &&
        isFiniteNumber(payload.serverAt) &&
        payload.serverAt >= 0
        ? (payload as SpaceServerFrame)
        : null;
    case "market":
      return isSpaceMarketState(payload.state) &&
        isFiniteNumber(payload.serverAt) &&
        payload.serverAt >= 0
        ? (payload as SpaceServerFrame)
        : null;
    case "celebrate":
      return isSpaceCelebration(payload.event) &&
        isFiniteNumber(payload.serverAt) &&
        payload.serverAt >= 0
        ? (payload as SpaceServerFrame)
        : null;
    case "hall-bgm":
      // 곡 목록에 없는 곡이면 새 서버가 더한 곡임. 끊지 않고 버림.
      return isSpaceHallBgmState(payload.state) &&
        isFiniteNumber(payload.serverAt) &&
        payload.serverAt >= 0
        ? (payload as SpaceServerFrame)
        : { v: SPACE_PROTOCOL_VERSION, t: "ignored" };
    case "welcome": {
      const selfPeer = payload.self;
      const peers = payload.peers;
      const messages = payload.messages;

      if (
        !isSpacePeer(selfPeer) ||
        !isPeerArray(peers) ||
        peers.length >= SPACE_MAX_OCCUPANTS ||
        peers.some((peer) => peer.seat === selfPeer.seat) ||
        (messages !== undefined && !isChatHistory(messages)) ||
        (payload.features !== undefined && !isFeatureList(payload.features))
      ) {
        return null;
      }

      return {
        ...payload,
        self: withDefaultModel(selfPeer),
        peers: peers.map(withDefaultModel),
        // 보스 정보가 깨져 와도 입장은 막지 않음. 보스만 안 보임.
        boss: isBossWelcome(payload.boss) ? payload.boss : undefined,
        // 곡 정보가 깨져 오거나 모르는 곡이어도 입장은 막지 않음. 기본 곡을 틂.
        hallBgm: isSpaceHallBgmState(payload.hallBgm) ? payload.hallBgm : undefined,
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
    case "kick":
      return isSeat(payload.from) &&
        (payload.to === undefined || isSeat(payload.to)) &&
        payload.to !== payload.from &&
        isKickDirection(payload.dirX, payload.dirZ) &&
        isKickTiming(payload)
        ? (payload as SpaceServerFrame)
        : null;
    case "boss":
      return isBossWire(payload.state) && isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "boss-hit":
      return isSeat(payload.from) &&
        isAmount(payload.damage) &&
        isAmount(payload.health) &&
        isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "player-hit":
      return isSeat(payload.seat) &&
        isBossAttack(payload.by) &&
        typeof payload.isFatal === "boolean" &&
        isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "hp":
      return isAmount(payload.health) &&
        (payload.by === undefined || isBossAttack(payload.by)) &&
        isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "respawn":
      return isTransform(payload) && isTimestamp(payload.reviveAt) && isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "boss-spawn":
      return isTimestamp(payload.spawnedAt) && isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    case "boss-dead":
      return isTimestamp(payload.killedAt) &&
        isSeat(payload.lastHitSeat) &&
        isBossRanking(payload.ranking) &&
        isTimestamp(payload.serverAt)
        ? (payload as SpaceServerFrame)
        : null;
    default:
      // 모르는 종류는 새 서버가 보낸 새 기능임. 끊으면 배포 때마다 새로고침 안 한
      // 탭이 떨어짐. 아는 종류가 깨져 온 경우만 위에서 null 로 끊음.
      return { v: SPACE_PROTOCOL_VERSION, t: "ignored" };
  }
};
