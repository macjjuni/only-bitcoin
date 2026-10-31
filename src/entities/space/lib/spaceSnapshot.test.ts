import { describe, expect, it } from "vitest";
import type { SpaceMotion, SpaceMotionSnapshot } from "../model/spaceProtocol";
import { decodeSpaceSnapshot, encodeSpaceSnapshot } from "./spaceSnapshot";

const createMotion = (overrides: Partial<SpaceMotion> = {}): SpaceMotion => ({
  seat: 0,
  x: 0,
  z: 0,
  yaw: 0,
  isRunning: false,
  ...overrides,
});

describe("공간 바이너리 스냅샷", () => {
  it("8바이트 LE 헤더와 좌석당 7바이트를 기록하고 cm 단위로 반올림한다", () => {
    const buffer = encodeSpaceSnapshot({
      timestamp: 0x12345678,
      players: [createMotion({ seat: 49, x: -12.345, z: 26.126, yaw: Math.PI, isRunning: true })],
    });
    expect(buffer.byteLength).toBe(15);
    expect([...new Uint8Array(buffer).slice(0, 8)]).toEqual([1, 1, 1, 0, 0x78, 0x56, 0x34, 0x12]);
    expect(decodeSpaceSnapshot(buffer)).toEqual({
      timestamp: 0x12345678,
      players: [createMotion({ seat: 49, x: -12.34, z: 26.13, yaw: Math.PI, isRunning: true })],
    });
  });

  it("부호 있는 좌표·최대 타임스탬프·50석 전체를 손실 범위 안에서 왕복한다", () => {
    const snapshot = {
      timestamp: 0xffffffff,
      players: Array.from({ length: 50 }, (_, seat) =>
        createMotion({
          seat,
          x: seat === 0 ? -327.68 : 327.67,
          z: -16,
          yaw: -0.1 + seat * 0.2,
        }),
      ),
    };
    const buffer = encodeSpaceSnapshot(snapshot);
    const decoded = decodeSpaceSnapshot(buffer);
    expect(buffer.byteLength).toBe(358);
    expect(decoded?.timestamp).toBe(snapshot.timestamp);
    expect(decoded?.players).toHaveLength(50);
    snapshot.players.forEach((player, index) => {
      const restored = decoded?.players[index];
      expect(restored?.x).toBe(player.x);
      expect(
        Math.abs(
          Math.atan2(
            Math.sin((restored?.yaw ?? 0) - player.yaw),
            Math.cos((restored?.yaw ?? 0) - player.yaw),
          ),
        ),
      ).toBeLessThanOrEqual(Math.PI / 256 + Number.EPSILON);
    });
  });

  it("빈 dirty 배치도 정상 패킷이다", () => {
    expect(decodeSpaceSnapshot(encodeSpaceSnapshot({ timestamp: 0, players: [] }))).toEqual({
      timestamp: 0,
      players: [],
    });
  });

  it.each([
    (view: DataView) => view.setUint8(0, 2),
    (view: DataView) => view.setUint8(1, 2),
    (view: DataView) => view.setUint16(2, 51, true),
    (view: DataView) => view.setUint8(8, 50),
    (view: DataView) => view.setUint8(14, 2),
  ])("잘못된 버전·종류·좌석·예약 플래그를 거절한다", (mutate) => {
    const buffer = encodeSpaceSnapshot({ timestamp: 100, players: [createMotion()] });
    mutate(new DataView(buffer));
    expect(decodeSpaceSnapshot(buffer)).toBeNull();
  });

  it("잘린 패킷·후행 바이트·중복 좌석을 거절한다", () => {
    const buffer = encodeSpaceSnapshot({
      timestamp: 100,
      players: [createMotion(), createMotion({ seat: 1 })],
    });
    expect(decodeSpaceSnapshot(new ArrayBuffer(7))).toBeNull();
    expect(decodeSpaceSnapshot(buffer.slice(0, -1))).toBeNull();
    const oversized = new Uint8Array(buffer.byteLength + 1);
    oversized.set(new Uint8Array(buffer));
    expect(decodeSpaceSnapshot(oversized.buffer)).toBeNull();
    new DataView(buffer).setUint8(15, 0);
    expect(decodeSpaceSnapshot(buffer)).toBeNull();
  });

  it.each([
    { timestamp: 2 ** 32, players: [] },
    { timestamp: -1, players: [] },
    { timestamp: 0.5, players: [] },
    { timestamp: 1, players: [createMotion({ x: 327.68 })] },
    { timestamp: 1, players: [createMotion({ z: Number.NaN })] },
    { timestamp: 1, players: [createMotion({ yaw: Number.POSITIVE_INFINITY })] },
    { timestamp: 1, players: [createMotion({ seat: 0.5 })] },
    { timestamp: 1, players: [createMotion(), createMotion()] },
    { timestamp: 1, players: Array.from({ length: 51 }, (_, seat) => createMotion({ seat })) },
  ])("표현 범위를 벗어난 송신 데이터를 조용히 오버플로하지 않는다", (snapshot: SpaceMotionSnapshot) => {
    expect(() => encodeSpaceSnapshot(snapshot)).toThrow(RangeError);
  });
});
