import { describe, expect, it } from "vitest";
import type { SpaceMotion, SpacePeer } from "../model/spaceProtocol";
import { createSpaceInterpolator } from "./remoteInterpolation";

const createPeer = (seat = 0, overrides: Partial<SpacePeer> = {}): SpacePeer => ({
  seat,
  nickname: "익명",
  colorIndex: 0,
  x: 0,
  z: 0,
  y: 0, yaw: 0,
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

describe("createSpaceInterpolator", () => {
  it("수신 시간보다 100ms 늦게 표시하고 수신 구간 밖에서는 외삽하지 않는다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 10)] }, 1000);
    expect(interpolator.sample(1000)[0].x).toBe(0);
    expect(interpolator.sample(1050)[0].x).toBe(5);
    expect(interpolator.sample(1100)[0].x).toBe(10);
    interpolator.pushSnapshot({ timestamp: 2, players: [createMotion(0, 20)] }, 1100);
    expect(interpolator.sample(1150)[0].x).toBe(15);
    expect(interpolator.sample(9000)[0].x).toBe(20);
  });

  it("0도를 가로지르는 yaw를 최단 방향으로 보간한다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer(0, { yaw: (350 * Math.PI) / 180 })]);
    interpolator.pushSnapshot(
      { timestamp: 1, players: [createMotion(0, 0, (10 * Math.PI) / 180)] },
      1000,
    );
    expect(Math.cos(interpolator.sample(1050)[0].yaw)).toBeCloseTo(1, 10);
    expect(Math.sin(interpolator.sample(1050)[0].yaw)).toBeCloseTo(0, 10);
  });

  it("오랫동안 멈춘 좌석의 첫 이동도 최근 100ms 구간에서 시작한다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 10)] }, 1000);
    expect(interpolator.sample(5000)[0].x).toBe(10);
    interpolator.pushSnapshot({ timestamp: 2, players: [createMotion(0, 20)] }, 10_000);
    expect(interpolator.sample(10_000)[0].x).toBe(10);
    expect(interpolator.sample(10_050)[0].x).toBe(15);
    expect(interpolator.sample(10_100)[0].x).toBe(20);
  });

  it("dirty 배치에 없는 좌석을 지우지 않고 같은 timestamp의 다른 좌석도 반영한다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer(), createPeer(1)]);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 10)] }, 1000);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(1, 30)] }, 1000);
    interpolator.pushSnapshot({ timestamp: 2, players: [createMotion(0, 20)] }, 1100);
    expect(interpolator.sample(1150).map((player) => player.x)).toEqual([15, 30]);
    interpolator.pushSnapshot({ timestamp: 3, players: [] }, 1200);
    expect(interpolator.sample(5000).map((player) => player.x)).toEqual([20, 30]);
  });

  it("매 프레임 배열과 플레이어 객체를 재생성하지 않고 명단 변경 때만 배열을 바꾼다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    const initialPlayers = interpolator.sample(0);
    const initialPlayer = initialPlayers[0];
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 10)] }, 1000);
    expect(interpolator.sample(1050)).toBe(initialPlayers);
    expect(interpolator.sample(1100)[0]).toBe(initialPlayer);
    interpolator.upsertPeer(createPeer(0, { nickname: "새 이름" }));
    expect(interpolator.sample(1200)).toBe(initialPlayers);
    expect(initialPlayer.nickname).toBe("새 이름");
    interpolator.upsertPeer(createPeer(1));
    const expandedPlayers = interpolator.sample(1200);
    expect(expandedPlayers).not.toBe(initialPlayers);
    interpolator.removePeer(1);
    expect(interpolator.sample(1200)).not.toBe(expandedPlayers);
  });

  it("늦게 도착한 서버 시각·역행한 로컬 시각은 버리고 uint32 wrap은 허용한다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 0xffffffce, players: [createMotion(0, 10)] }, 1000);
    interpolator.pushSnapshot({ timestamp: 50, players: [createMotion(0, 20)] }, 1100);
    interpolator.pushSnapshot({ timestamp: 49, players: [createMotion(0, 99)] }, 1200);
    interpolator.pushSnapshot({ timestamp: 51, players: [createMotion(0, 99)] }, 900);
    expect(interpolator.sample(2000)[0].x).toBe(20);
  });

  it("같은 좌석·서버 시각의 도착 순서와 동일 수신시각을 안전하게 처리한다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 10)] }, 1000);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(0, 20)] }, 1000);
    expect(interpolator.sample(1050)[0].x).toBe(10);
    expect(interpolator.sample(1100)[0].x).toBe(20);
  });

  it("알 수 없는 좌석·잘못된 배치는 명단을 만들지 않고 clear 후 좌석 재사용은 과거 이동을 버린다", () => {
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 1, players: [createMotion(1, 10)] }, 1000);
    interpolator.pushSnapshot({ timestamp: 2, players: [createMotion(0, Number.NaN)] }, 1100);
    expect(interpolator.sample(1200).map((player) => player.x)).toEqual([0]);
    interpolator.pushSnapshot({ timestamp: 2, players: [createMotion(0, 10)] }, 1100);
    interpolator.removePeer(0);
    interpolator.upsertPeer(createPeer(0, { x: 50 }));
    expect(interpolator.sample(2000)[0].x).toBe(50);
    interpolator.clear();
    expect(interpolator.sample(2000)).toEqual([]);
    interpolator.setPeers([createPeer()]);
    interpolator.pushSnapshot({ timestamp: 0, players: [createMotion(0, 20)] }, 0);
    expect(interpolator.sample(100)[0].x).toBe(20);
  });

  it("밀집된 버스트를 받아도 목표 시간 양끝을 고르고 입력 객체를 변경하지 않는다", () => {
    const interpolator = createSpaceInterpolator();
    const peer = createPeer();
    interpolator.setPeers([peer]);
    for (let index = 0; index < 20; index += 1) {
      interpolator.pushSnapshot(
        { timestamp: index, players: [createMotion(0, index)] },
        1000 + index * 10,
      );
    }
    expect(interpolator.sample(1255)[0].x).toBeCloseTo(15.5);
    expect(peer.x).toBe(0);
    expect(interpolator.sample(Number.NaN)[0].x).toBeCloseTo(15.5);
  });
});
