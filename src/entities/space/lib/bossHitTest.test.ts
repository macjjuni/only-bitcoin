import { describe, expect, it } from "vitest";
import { SPACE_BOSS, SPACE_BOSS_ATTACKS, SPACE_BOSS_COMBAT } from "@/entities/space/model/boss";
import {
  canKickReachBoss,
  clampToBossArenaFloor,
  isInsideBossArena,
  isInsideBossArenaFloor,
  isInsideBossAttack,
  isInsideBossChargeSweep,
  isInsideBossSpin,
} from "./bossHitTest";

/** 원점에서 −Z 를 보는 보스. 앞이 −Z, 오른쪽이 +X 임. */
const ORIGIN = { x: 0, z: 0, yaw: 0 };
/** 보스 기준 (앞, 옆) 을 월드 좌표로. */
const at = (forward: number, side: number) => ({ x: side, z: -forward });
/** 보스 앞에서 `degrees` 만큼 옆으로 벌어진 2 m 지점. */
const atAngle = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;

  return at(2 * Math.cos(radians), 2 * Math.sin(radians));
};

describe("휘두르기 부채꼴", () => {
  const { radius } = SPACE_BOSS_ATTACKS.swipe;

  it("앞쪽 반지름 안이면 맞고 뒤는 안 맞는다", () => {
    expect(isInsideBossAttack("swipe", ORIGIN, at(2, 0), 0)).toBe(true);
    expect(isInsideBossAttack("swipe", ORIGIN, at(radius + 0.01, 0), 0)).toBe(false);
    expect(isInsideBossAttack("swipe", ORIGIN, at(-1, 0), 0)).toBe(false);
  });

  it("좌우 60도가 경계다", () => {
    expect(isInsideBossAttack("swipe", ORIGIN, atAngle(59), 0)).toBe(true);
    expect(isInsideBossAttack("swipe", ORIGIN, atAngle(-59), 0)).toBe(true);
    expect(isInsideBossAttack("swipe", ORIGIN, atAngle(61), 0)).toBe(false);
  });

  it("여유만큼 안쪽으로 깎아 판정한다", () => {
    // 여유의 절반만 들어온 자리. 여유를 바꿔도 따라가게 상수에서 구함.
    const justInside = at(radius - SPACE_BOSS_COMBAT.hitMargin / 2, 0);

    expect(isInsideBossAttack("swipe", ORIGIN, justInside, 0)).toBe(true);
    expect(isInsideBossAttack("swipe", ORIGIN, justInside)).toBe(false);
  });

  it("보스 방향을 따라 돈다", () => {
    // yaw 가 반의 반 바퀴면 전방이 −X.
    const turned = { x: 10, z: 5, yaw: Math.PI / 2 };

    expect(isInsideBossAttack("swipe", turned, { x: 8, z: 5 }, 0)).toBe(true);
    expect(isInsideBossAttack("swipe", turned, { x: 12, z: 5 }, 0)).toBe(false);
  });
});

describe("내려찍기 원", () => {
  const { radius, forwardOffset } = SPACE_BOSS_ATTACKS.slam;

  it("중심이 보스 앞에 있다", () => {
    expect(isInsideBossAttack("slam", ORIGIN, at(forwardOffset, 0), 0)).toBe(true);
    expect(isInsideBossAttack("slam", ORIGIN, at(forwardOffset + radius - 0.01, 0), 0)).toBe(true);
    expect(isInsideBossAttack("slam", ORIGIN, at(forwardOffset + radius + 0.01, 0), 0)).toBe(false);
    // 원이 보스 뒤로 1.7 m 까지 덮음.
    expect(isInsideBossAttack("slam", ORIGIN, at(forwardOffset - radius + 0.01, 0), 0)).toBe(true);
    expect(isInsideBossAttack("slam", ORIGIN, at(forwardOffset - radius - 0.01, 0), 0)).toBe(false);
  });
});

describe("회전 원", () => {
  const { radius } = SPACE_BOSS_ATTACKS.spin;

  it("발밑이 중심이라 앞 · 옆 · 뒤가 똑같이 맞는다", () => {
    for (const point of [at(radius - 0.01, 0), at(0, radius - 0.01), at(-(radius - 0.01), 0)]) {
      expect(isInsideBossSpin(ORIGIN, point, 0)).toBe(true);
    }
    for (const point of [at(radius + 0.01, 0), at(0, radius + 0.01), at(-(radius + 0.01), 0)]) {
      expect(isInsideBossSpin(ORIGIN, point, 0)).toBe(false);
    }
  });

  it("기본 판정은 안쪽으로 깎지 않고 예고 원 그대로다", () => {
    expect(isInsideBossSpin(ORIGIN, at(-(radius - 0.01), 0))).toBe(true);
    expect(isInsideBossSpin(ORIGIN, at(-(radius + 0.01), 0))).toBe(false);
  });
});

describe("돌진 직선", () => {
  const { width, forwardOffset, travel, length } = SPACE_BOSS_ATTACKS.charge;
  const bodyBack = 2 - SPACE_BOSS.bodyRadius;

  it("나아간 구간의 몸 뒤끝부터 앞끝까지 맞는다", () => {
    expect(isInsideBossChargeSweep(ORIGIN, at(3 + forwardOffset - 0.01, 0), 2, 3, 0)).toBe(true);
    expect(isInsideBossChargeSweep(ORIGIN, at(3 + forwardOffset + 0.01, 0), 2, 3, 0)).toBe(false);
    expect(isInsideBossChargeSweep(ORIGIN, at(bodyBack + 0.01, 0), 2, 3, 0)).toBe(true);
    expect(isInsideBossChargeSweep(ORIGIN, at(bodyBack - 0.01, 0), 2, 3, 0)).toBe(false);
  });

  it("폭의 절반이 경계다", () => {
    expect(isInsideBossChargeSweep(ORIGIN, at(3, width / 2 - 0.01), 2, 3, 0)).toBe(true);
    expect(isInsideBossChargeSweep(ORIGIN, at(3, -(width / 2 - 0.01)), 2, 3, 0)).toBe(true);
    expect(isInsideBossChargeSweep(ORIGIN, at(3, width / 2 + 0.01), 2, 3, 0)).toBe(false);
  });

  it("끝까지 쓸면 예고 직선 끝에 닿는다", () => {
    const laneEnd = forwardOffset + length;

    expect(travel + forwardOffset).toBeCloseTo(laneEnd, 6);
    expect(isInsideBossChargeSweep(ORIGIN, at(laneEnd - 0.01, 0), 0, travel, 0)).toBe(true);
    expect(isInsideBossChargeSweep(ORIGIN, at(laneEnd + 0.01, 0), 0, travel, 0)).toBe(false);
  });
});

describe("아레나", () => {
  const { centerX, centerZ, floorY, halfWidth, halfDepth, cornerRadius } = SPACE_BOSS.arena;

  it("안뜰 바닥 모양(둥근 직사각형)대로 본다", () => {
    // 변의 가운데는 끝까지 안임. 원이던 때는 z 쪽 끝 4 m 가 빠졌음.
    expect(isInsideBossArenaFloor(centerX + halfWidth - 0.1, centerZ)).toBe(true);
    expect(isInsideBossArenaFloor(centerX + halfWidth + 0.1, centerZ)).toBe(false);
    expect(isInsideBossArenaFloor(centerX, centerZ + halfDepth - 0.1)).toBe(true);
    expect(isInsideBossArenaFloor(centerX, centerZ - halfDepth - 0.1)).toBe(false);
    // 모서리는 둥글려서, 각진 구석 끝은 밖이고 호 안쪽은 안임.
    expect(isInsideBossArenaFloor(centerX + halfWidth - 0.1, centerZ + halfDepth - 0.1)).toBe(
      false,
    );
    const arcOffset = cornerRadius * (1 - Math.SQRT1_2) + 0.1;

    expect(
      isInsideBossArenaFloor(centerX + halfWidth - arcOffset, centerZ + halfDepth - arcOffset),
    ).toBe(true);
    // 홀 쪽 발코니·계단(x 21 ~ 26)은 밖임.
    expect(isInsideBossArenaFloor(24, centerZ)).toBe(false);
  });

  it("여유를 주면 그만큼 안으로 줄여 본다", () => {
    expect(isInsideBossArenaFloor(centerX + halfWidth - 1, centerZ, 1.2)).toBe(false);
    expect(isInsideBossArenaFloor(centerX + halfWidth - 1.3, centerZ, 1.2)).toBe(true);
  });

  it("밖의 점은 가장 가까운 안쪽 점으로 당긴다", () => {
    const inside = clampToBossArenaFloor(centerX + 2, centerZ - 3);
    const pastEdge = clampToBossArenaFloor(centerX + halfWidth + 5, centerZ + 2, 1.2);
    const pastCorner = clampToBossArenaFloor(centerX + 40, centerZ + 40, 1.2);

    expect(inside).toEqual({ x: centerX + 2, z: centerZ - 3 });
    // 변 밖이면 변으로 곧장 당겨서 변을 따라 미끄러짐.
    expect(pastEdge.x).toBeCloseTo(centerX + halfWidth - 1.2, 6);
    expect(pastEdge.z).toBeCloseTo(centerZ + 2, 6);
    expect(isInsideBossArenaFloor(pastCorner.x, pastCorner.z, 1.2)).toBe(true);
    expect(isInsideBossArenaFloor(pastCorner.x, pastCorner.z, 1.3)).toBe(false);
  });

  it("높이도 같이 본다", () => {
    expect(isInsideBossArena({ x: centerX + halfWidth - 0.1, y: floorY, z: centerZ })).toBe(true);
    expect(isInsideBossArena({ x: centerX + halfWidth + 0.1, y: floorY, z: centerZ })).toBe(false);
    // 발코니(안뜰 바닥보다 4 m 위)는 같은 자리 위라도 밖임.
    expect(isInsideBossArena({ x: centerX, y: floorY + 4, z: centerZ })).toBe(false);
    // 점프 중은 안임.
    expect(isInsideBossArena({ x: centerX, y: floorY + 1.5, z: centerZ })).toBe(true);
  });
});

describe("유저 공격 사거리", () => {
  const boss = { x: 0, z: 0 };
  const reach = SPACE_BOSS.bodyRadius + SPACE_BOSS_COMBAT.kickReach;

  it("몸통 반지름을 뺀 거리로 잰다", () => {
    // 보스의 +Z 쪽에 서서 −Z(보스 쪽)를 봄.
    expect(canKickReachBoss(boss, { x: 0, z: reach - 0.01, yaw: 0 })).toBe(true);
    expect(canKickReachBoss(boss, { x: 0, z: reach + 0.01, yaw: 0 })).toBe(false);
    // 긴 무기는 받은 사거리만큼 더 닿는다.
    expect(canKickReachBoss(boss, { x: 0, z: reach + 0.5, yaw: 0 }, 2.6)).toBe(true);
    expect(canKickReachBoss(boss, { x: 0, z: reach + 0.7, yaw: 0 }, 2.6)).toBe(false);
  });

  it("보스를 등지면 안 닿는다", () => {
    expect(canKickReachBoss(boss, { x: 0, z: 2, yaw: Math.PI })).toBe(false);
    expect(canKickReachBoss(boss, { x: 0, z: 2, yaw: Math.PI / 2 })).toBe(false);
    expect(canKickReachBoss(boss, { x: 0, z: 2, yaw: 0.5 })).toBe(true);
  });
});
