import {
  isSpaceMotion,
  SPACE_PROTOCOL_VERSION,
  type SpaceMotionSnapshot,
} from "../model/spaceProtocol";
import { SPACE_MAX_ALTITUDE, SPACE_MAX_OCCUPANTS } from "../model/spaceWorld";

const HEADER_BYTES = 8;
/**
 * 좌석 1 + x 2 + z 2 + yaw 1 + y 2 + 플래그 1.
 *
 * 벙커 시절에는 8바이트였다(`y` 1바이트). 섬은 층이 여러 개라 `y` 가 절대
 * 높이고 2.55 m 에 들어가지 않는다. 50명 기준으로 450바이트, 초당 10번
 * 보내므로 늘어난 50바이트는 사실상 공짜다.
 */
const PLAYER_BYTES = 9;
/** 수평 좌표는 1 cm 정밀도의 2바이트로 담는다. */
const POSITION_SCALE = 100;
/**
 * 높이는 1 cm 정밀도의 **2바이트**로 담는다.
 *
 * 상한 36 m 는 3,600 으로 `Uint16`(65,535) 안에 넉넉히 들어간다. 정밀도를
 * 낮춰 1바이트에 밀어 넣을 수도 있지만(14 cm 격자) 계단 한 칸이 25 cm 라
 * 다른 사람이 계단을 오르는 모습이 뚝뚝 끊긴다.
 */
const HEIGHT_SCALE = 100;
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

/**
 * 스냅샷에 실리는 정밀도로 접는다(좌표 1 cm, 방향 256 단계).
 *
 * 클라이언트가 보낼 값을 미리 접어, 서버가 되돌려준 자기 위치와 같은 격자에서 비교한다.
 * 정밀도를 여기서만 정해서 스냅샷 형식을 바꿔도 비교가 어긋나지 않는다.
 */
export const quantizeSpaceMotion = (motion: {
  x: number;
  y: number;
  z: number;
  yaw: number;
}): { x: number; y: number; z: number; yaw: number } => {
  return {
    x: Math.round(motion.x * POSITION_SCALE) / POSITION_SCALE,
    y: Math.round(motion.y * HEIGHT_SCALE) / HEIGHT_SCALE,
    z: Math.round(motion.z * POSITION_SCALE) / POSITION_SCALE,
    yaw: (encodeYaw(motion.yaw) / YAW_STEPS) * FULL_TURN,
  };
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
    view.setInt16(offset + 1, Math.round(player.x * POSITION_SCALE), true);
    view.setInt16(offset + 3, Math.round(player.z * POSITION_SCALE), true);
    view.setUint8(offset + 5, encodeYaw(player.yaw));
    view.setUint16(offset + 6, Math.round(player.y * HEIGHT_SCALE), true);
    view.setUint8(offset + 8, player.isRunning ? RUNNING_FLAG : 0);
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
    const flags = view.getUint8(offset + 8);

    if (
      seat >= SPACE_MAX_OCCUPANTS ||
      occupiedSeats.has(seat) ||
      (flags & ~RUNNING_FLAG) !== 0 ||
      view.getUint16(offset + 6, true) > SPACE_MAX_ALTITUDE * HEIGHT_SCALE
    ) {
      return null;
    }

    occupiedSeats.add(seat);
    snapshot.players.push({
      seat,
      x: view.getInt16(offset + 1, true) / POSITION_SCALE,
      z: view.getInt16(offset + 3, true) / POSITION_SCALE,
      yaw: (view.getUint8(offset + 5) / YAW_STEPS) * FULL_TURN,
      y: view.getUint16(offset + 6, true) / HEIGHT_SCALE,
      isRunning: (flags & RUNNING_FLAG) !== 0,
    });
  }

  return snapshot;
};
