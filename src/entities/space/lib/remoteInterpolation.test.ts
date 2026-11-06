import { describe, expect, it } from "vitest";
import type { SpaceMotion, SpacePeer } from "../model/spaceProtocol";
import { createSpaceInterpolator, type SpaceInterpolator } from "./remoteInterpolation";

const createPeer = (seat = 0, overrides: Partial<SpacePeer> = {}): SpacePeer => ({
  seat,
  nickname: "익명",
  colorIndex: 0,
  modelIndex: 0,
  x: 0,
  z: 0,
  y: 0,
  yaw: 0,
  isRunning: false,
  ...overrides,
});
const createMotion = (seat: number, x: number, yaw = 0, y = 0): SpaceMotion => ({
  seat,
  x,
  y,
  z: 0,
  yaw,
  isRunning: true,
});
/** 기본은 서버 시각 그대로 도착함(오프셋 0, 지연 없음). */
const push = (
  interpolator: SpaceInterpolator,
  timestamp: number,
  players: SpaceMotion[],
  receivedAt = timestamp,
): void => {
  interpolator.pushSnapshot({ timestamp, players }, receivedAt);
};

describe("createSpaceInterpolator", () => {
  it("서버 시각 기준 200ms 늦게 그림", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 1000, [createMotion(0, 10)]);
    expect(interpolator.sample(1100)[0].x).toBe(0);
    expect(interpolator.sample(1150)[0].x).toBe(5);
    expect(interpolator.sample(1200)[0].x).toBe(10);
    push(interpolator, 1100, [createMotion(0, 20)]);
    expect(interpolator.sample(1250)[0].x).toBe(15);
  });

  it("늦게 온 패킷에도 멈추지 않고 계속 움직임", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    const packets = [
      { timestamp: 1000, x: 10, receivedAt: 1000 },
      { timestamp: 1100, x: 20, receivedAt: 1180 },
      { timestamp: 1200, x: 30, receivedAt: 1205 },
      { timestamp: 1300, x: 40, receivedAt: 1300 },
    ];
    let previousX = Number.NEGATIVE_INFINITY;

    for (let now = 1000; now <= 1490; now += 5) {
      for (const packet of packets.filter((candidate) => candidate.receivedAt === now)) {
        push(interpolator, packet.timestamp, [createMotion(0, packet.x)], packet.receivedAt);
      }
      if (now < 1110) {
        continue;
      }
      const x = interpolator.sample(now)[0].x;
      expect(x).toBeGreaterThan(previousX);
      previousX = x;
    }
  });

  it("몰려 온 패킷을 순간이동 없이 고르게 풀어냄", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 1000, [createMotion(0, 10)], 1000);
    push(interpolator, 1100, [createMotion(0, 20)], 1200);
    push(interpolator, 1200, [createMotion(0, 30)], 1200);
    push(interpolator, 1300, [createMotion(0, 40)], 1300);
    let previousX = interpolator.sample(1200)[0].x;

    for (let now = 1210; now <= 1450; now += 10) {
      const x = interpolator.sample(now)[0].x;
      // 10 ms 에 1 m 꼴. 재생 속도 보정 5% 를 넘게 튀면 안 됨.
      expect(x - previousX).toBeGreaterThan(0.9);
      expect(x - previousX).toBeLessThan(1.1);
      previousX = x;
    }
  });

  it("지터가 이어지면 지연을 200~300ms 안에서 늘림", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    const packets = Array.from({ length: 60 }, (_, index) => ({
      timestamp: 1000 + index * 100,
      x: index,
      receivedAt: 1000 + index * 100 + (index % 2 === 1 ? 80 : 0),
    }));
    let packetIndex = 0;
    let delay = 0;

    for (let now = 1000; now <= 6900; now += 10) {
      while (packetIndex < packets.length && packets[packetIndex].receivedAt <= now) {
        const packet = packets[packetIndex];
        push(interpolator, packet.timestamp, [createMotion(0, packet.x)], packet.receivedAt);
        packetIndex += 1;
      }
      const x = interpolator.sample(now)[0].x;
      delay = now - (1000 + x * 100);
    }

    expect(delay).toBeGreaterThan(230);
    expect(delay).toBeLessThanOrEqual(300);
  });

  it("0도를 가로지르는 yaw를 최단 방향으로 보간함", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer(0, { yaw: (350 * Math.PI) / 180 })]);
    push(interpolator, 1000, [createMotion(0, 0, (10 * Math.PI) / 180)]);
    expect(Math.cos(interpolator.sample(1150)[0].yaw)).toBeCloseTo(1, 10);
    expect(Math.sin(interpolator.sample(1150)[0].yaw)).toBeCloseTo(0, 10);
  });

  it("오래 멈춘 좌석의 첫 이동도 마지막 한 칸에서 출발함", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 1000, [createMotion(0, 10)]);
    push(interpolator, 1100, []);
    expect(interpolator.sample(5000)[0].x).toBe(10);
    push(interpolator, 10_000, [createMotion(0, 20)]);
    expect(interpolator.sample(10_100)[0].x).toBe(10);
    expect(interpolator.sample(10_150)[0].x).toBe(15);
    expect(interpolator.sample(10_200)[0].x).toBe(20);
  });

  it("틱 하나를 건너뛴 좌석은 멈추지 않고 두 칸에 걸쳐 보간함", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer(), createPeer(1)]);
    push(interpolator, 1000, [createMotion(0, 10), createMotion(1, 0)]);
    push(interpolator, 1100, [createMotion(1, 1)]);
    push(interpolator, 1200, [createMotion(0, 30), createMotion(1, 2)]);
    expect(interpolator.sample(1300)[0].x).toBe(20);
    expect(interpolator.sample(1350)[0].x).toBe(25);
  });

  it("스트림 전체가 끊기면 감속 외삽하고 다른 틱이 오면 멈춘 것으로 봄", () => {
    const stalled = createSpaceInterpolator();
    stalled.setPeers([createPeer()]);
    push(stalled, 1000, [createMotion(0, 10)]);
    push(stalled, 1100, [createMotion(0, 20)]);
    expect(stalled.sample(1300)[0].x).toBe(20);
    expect(stalled.sample(1360)[0].x).toBeCloseTo(20 + 10 * 1.2 * (1 - Math.exp(-0.5)), 5);
    const farX = stalled.sample(9000)[0].x;
    expect(farX).toBeGreaterThan(31.9);
    expect(farX).toBeLessThanOrEqual(32);

    const stopped = createSpaceInterpolator();
    stopped.setPeers([createPeer()]);
    push(stopped, 1000, [createMotion(0, 10)]);
    push(stopped, 1100, [createMotion(0, 20)]);
    push(stopped, 1200, []);
    expect(stopped.sample(1360)[0].x).toBe(20);
    expect(stopped.sample(9000)[0].x).toBe(20);
  });

  it("dirty 배치에 없는 좌석을 지우지 않고 같은 timestamp의 다른 좌석도 반영함", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer(), createPeer(1)]);
    push(interpolator, 1000, [createMotion(0, 10)]);
    push(interpolator, 1000, [createMotion(1, 30)]);
    push(interpolator, 1100, [createMotion(0, 20)]);
    expect(interpolator.sample(1250).map((player) => player.x)).toEqual([15, 30]);
    push(interpolator, 1200, []);
    expect(interpolator.sample(5000).map((player) => player.x)).toEqual([20, 30]);
  });

  it("매 프레임 배열과 플레이어 객체를 재생성하지 않고 명단 변경 때만 배열을 바꿈", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    const initialPlayers = interpolator.sample(0);
    const initialPlayer = initialPlayers[0];
    push(interpolator, 1000, [createMotion(0, 10)]);
    expect(interpolator.sample(1150)).toBe(initialPlayers);
    expect(interpolator.sample(1200)[0]).toBe(initialPlayer);
    interpolator.upsertPeer(createPeer(0, { nickname: "새 이름" }));
    expect(interpolator.sample(1300)).toBe(initialPlayers);
    expect(initialPlayer.nickname).toBe("새 이름");
    interpolator.upsertPeer(createPeer(1));
    const expandedPlayers = interpolator.sample(1300);
    expect(expandedPlayers).not.toBe(initialPlayers);
    interpolator.removePeer(1);
    expect(interpolator.sample(1300)).not.toBe(expandedPlayers);
  });

  it("늦게 도착한 서버 시각·역행한 로컬 시각은 버리고 uint32 wrap은 허용함", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 0xffffffce, [createMotion(0, 10)], 1000);
    push(interpolator, 50, [createMotion(0, 20)], 1100);
    push(interpolator, 49, [createMotion(0, 99)], 1200);
    push(interpolator, 51, [createMotion(0, 99)], 900);
    push(interpolator, 150, [], 1200);
    expect(interpolator.sample(1250)[0].x).toBe(15);
    expect(interpolator.sample(5000)[0].x).toBe(20);
  });

  it("같은 좌석·서버 시각이 두 번 오면 나중 값으로 바꿈", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 1000, [createMotion(0, 10)]);
    push(interpolator, 1000, [createMotion(0, 20)]);
    expect(interpolator.sample(1150)[0].x).toBe(10);
    expect(interpolator.sample(1200)[0].x).toBe(20);
  });

  it("알 수 없는 좌석·잘못된 배치는 명단을 만들지 않고 clear 후 좌석 재사용은 과거 이동을 버림", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    push(interpolator, 1000, [createMotion(1, 10)]);
    push(interpolator, 1100, [createMotion(0, Number.NaN)]);
    expect(interpolator.sample(1300).map((player) => player.x)).toEqual([0]);
    push(interpolator, 1100, [createMotion(0, 10)]);
    interpolator.removePeer(0);
    interpolator.upsertPeer(createPeer(0, { x: 50 }));
    expect(interpolator.sample(2000)[0].x).toBe(50);
    interpolator.clear();
    expect(interpolator.sample(2000)).toEqual([]);
    interpolator.setPeers([createPeer()]);
    push(interpolator, 0, [createMotion(0, 20)]);
    push(interpolator, 100, []);
    expect(interpolator.sample(300)[0].x).toBe(20);
  });

  it("밀집된 버스트를 받아도 목표 시간 양끝을 고르고 입력 객체를 변경하지 않음", () => {
    const interpolator = createSpaceInterpolator();
    const peer = createPeer();
    interpolator.setPeers([peer]);
    for (let index = 0; index < 20; index += 1) {
      push(interpolator, 1000 + index * 10, [createMotion(0, index)]);
    }
    expect(interpolator.sample(1355)[0].x).toBeCloseTo(15.5);
    expect(peer.x).toBe(0);
    expect(interpolator.sample(Number.NaN)[0].x).toBeCloseTo(15.5);
  });
});
