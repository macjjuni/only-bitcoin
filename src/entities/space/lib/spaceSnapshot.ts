import {
  isSpaceMotion,
  SPACE_PROTOCOL_VERSION,
  type SpaceMotionSnapshot,
} from "../model/spaceProtocol";
import { SPACE_MAX_OCCUPANTS } from "../model/spaceWorld";

const HEADER_BYTES = 8;
const PLAYER_BYTES = 7;
const SNAPSHOT_KIND = 1;
const RUNNING_FLAG = 1;
const FULL_TURN = Math.PI * 2;
const YAW_STEPS = 256;
const MAX_TIMESTAMP = 0xffff_ffff;

const isTimestamp = (timestamp: number): boolean => {
  return Number.isInteger(timestamp) && timestamp >= 0 && timestamp <= MAX_TIMESTAMP;
};

export const isValidSpaceSnapshot = (snapshot: SpaceMotionSnapshot): boolean => {
  return (
    isTimestamp(snapshot.timestamp) &&
    Array.isArray(snapshot.players) &&
    snapshot.players.length <= SPACE_MAX_OCCUPANTS &&
    snapshot.players.every(isSpaceMotion) &&
    new Set(snapshot.players.map((player) => player.seat)).size === snapshot.players.length
  );
};

/** 한 바퀴 범위로 접은 각도를 가장 가까운 8비트 방향으로 양자화한다. */
const encodeYaw = (yaw: number): number => {
  const normalizedYaw = ((yaw % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return Math.round((normalizedYaw / FULL_TURN) * YAW_STEPS) % YAW_STEPS;
};

/** 고정 길이 LE 패킷. 타임스탬프는 서버가 Date.now() >>> 0 으로 변환해 전달한다. */
export const encodeSpaceSnapshot = (snapshot: SpaceMotionSnapshot): ArrayBuffer => {
  if (!isValidSpaceSnapshot(snapshot)) {
    throw new RangeError("공간 스냅샷의 좌석·좌표·타임스탬프 범위가 올바르지 않습니다.");
  }

  const buffer = new ArrayBuffer(HEADER_BYTES + snapshot.players.length * PLAYER_BYTES);
  const view = new DataView(buffer);
  view.setUint8(0, SPACE_PROTOCOL_VERSION);
  view.setUint8(1, SNAPSHOT_KIND);
  view.setUint16(2, snapshot.players.length, true);
  view.setUint32(4, snapshot.timestamp, true);

  snapshot.players.forEach((player, playerIndex) => {
    const offset = HEADER_BYTES + playerIndex * PLAYER_BYTES;
    view.setUint8(offset, player.seat);
    view.setInt16(offset + 1, Math.round(player.x * 100), true);
    view.setInt16(offset + 3, Math.round(player.z * 100), true);
    view.setUint8(offset + 5, encodeYaw(player.yaw));
    view.setUint8(offset + 6, player.isRunning ? RUNNING_FLAG : 0);
  });

  return buffer;
};

/** 길이·버전·종류·좌석·예약 플래그를 모두 확인한 뒤에만 상태에 반영한다. */
export const decodeSpaceSnapshot = (buffer: ArrayBuffer): SpaceMotionSnapshot | null => {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < HEADER_BYTES) {
    return null;
  }

  const view = new DataView(buffer);
  const count = view.getUint16(2, true);

  if (
    view.getUint8(0) !== SPACE_PROTOCOL_VERSION ||
    view.getUint8(1) !== SNAPSHOT_KIND ||
    count > SPACE_MAX_OCCUPANTS ||
    buffer.byteLength !== HEADER_BYTES + count * PLAYER_BYTES
  ) {
    return null;
  }

  const snapshot: SpaceMotionSnapshot = { timestamp: view.getUint32(4, true), players: [] };
  const occupiedSeats = new Set<number>();

  for (let playerIndex = 0; playerIndex < count; playerIndex += 1) {
    const offset = HEADER_BYTES + playerIndex * PLAYER_BYTES;
    const seat = view.getUint8(offset);
    const flags = view.getUint8(offset + 6);

    if (seat >= SPACE_MAX_OCCUPANTS || occupiedSeats.has(seat) || (flags & ~RUNNING_FLAG) !== 0) {
      return null;
    }

    occupiedSeats.add(seat);
    snapshot.players.push({
      seat,
      x: view.getInt16(offset + 1, true) / 100,
      z: view.getInt16(offset + 3, true) / 100,
      yaw: (view.getUint8(offset + 5) / YAW_STEPS) * FULL_TURN,
      isRunning: (flags & RUNNING_FLAG) !== 0,
    });
  }

  return snapshot;
};
