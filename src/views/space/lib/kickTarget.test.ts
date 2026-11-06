import { describe, expect, it } from "vitest";
import type { RemotePlayer } from "@/entities/space";
import { selectKickTarget } from "./kickTarget";

const createPlayer = (seat: number, x: number, z: number, y = 0): RemotePlayer => ({
  seat,
  nickname: `p${seat}`,
  colorIndex: 0,
  modelIndex: 0,
  x,
  y,
  z,
  yaw: 0,
});
/** yaw 0 은 -Z 를 봄. */
const self = { x: 0, y: 0, z: 0, yaw: 0 };

describe("selectKickTarget", () => {
  it("정면 거리 안에서 가장 가까운 사람을 고름", () => {
    const players = [createPlayer(1, 0, -1.4), createPlayer(2, 0.2, -0.8)];

    expect(selectKickTarget(players, self)).toBe(2);
  });

  it("등 뒤·너무 먼·높이 차가 큰 사람은 안 고름", () => {
    expect(selectKickTarget([createPlayer(1, 0, 1)], self)).toBeNull();
    expect(selectKickTarget([createPlayer(1, 0, -1.7)], self)).toBeNull();
    expect(selectKickTarget([createPlayer(1, 0, -1, 1.5)], self)).toBeNull();
  });

  it("옆쪽은 정면 78° 안까지만 고름", () => {
    expect(selectKickTarget([createPlayer(1, -1, -0.3)], self)).toBe(1);
    expect(selectKickTarget([createPlayer(1, -1, 0)], self)).toBeNull();
  });

  it("바라보는 방향을 따름", () => {
    // yaw π/2 는 -X 를 봄.
    expect(selectKickTarget([createPlayer(1, -1, 0)], { ...self, yaw: Math.PI / 2 })).toBe(1);
  });

  it("겹쳐 서 있으면 방향과 상관없이 고름", () => {
    expect(selectKickTarget([createPlayer(1, 0.01, 0.01)], self)).toBe(1);
  });
});
