import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_COLORS, SPACE_BOUNDS, SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { advanceStressDummies, createStressDummies } from "@/views/space/lib/stressDummies";

describe("createStressDummies", () => {
  it("요청한 수만큼 좌석 0부터 차례로 만든다", () => {
    const dummies = createStressDummies(SPACE_MAX_OCCUPANTS);

    expect(dummies).toHaveLength(SPACE_MAX_OCCUPANTS);
    expect(dummies.map(({ seat }) => seat)).toEqual(
      Array.from({ length: SPACE_MAX_OCCUPANTS }, (_, index) => index),
    );
  });

  it("색 인덱스는 팔레트 범위 안에 있다", () => {
    for (const dummy of createStressDummies(SPACE_MAX_OCCUPANTS)) {
      expect(dummy.colorIndex).toBeGreaterThanOrEqual(0);
      expect(dummy.colorIndex).toBeLessThan(SPACE_AVATAR_COLORS.length);
    }
  });

  it("0 이하를 요청하면 빈 배열이다", () => {
    expect(createStressDummies(0)).toEqual([]);
    expect(createStressDummies(-5)).toEqual([]);
  });

  it("궤도 중심이 한곳에 뭉치지 않는다", () => {
    const dummies = createStressDummies(SPACE_MAX_OCCUPANTS);
    const averageX =
      dummies.reduce((total, { orbitCenterX }) => total + orbitCenterX, 0) / dummies.length;
    const spreadX = Math.max(
      ...dummies.map(({ orbitCenterX }) => Math.abs(orbitCenterX - averageX)),
    );

    expect(spreadX).toBeGreaterThan(8);
  });
});

describe("advanceStressDummies", () => {
  it("어느 시점에서도 이동 경계를 벗어나지 않는다", () => {
    const dummies = createStressDummies(SPACE_MAX_OCCUPANTS);

    for (const elapsedSeconds of [0, 0.5, 3, 17, 120]) {
      advanceStressDummies(dummies, elapsedSeconds);

      for (const dummy of dummies) {
        expect(dummy.x).toBeGreaterThanOrEqual(SPACE_BOUNDS.minX);
        expect(dummy.x).toBeLessThanOrEqual(SPACE_BOUNDS.maxX);
        expect(dummy.z).toBeGreaterThanOrEqual(SPACE_BOUNDS.minZ);
        expect(dummy.z).toBeLessThanOrEqual(SPACE_BOUNDS.maxZ);
      }
    }
  });

  it("시간이 흐르면 위치가 바뀐다", () => {
    const dummies = createStressDummies(8);
    advanceStressDummies(dummies, 0);
    const initialPositions = dummies.map(({ x, z }) => `${x}:${z}`);

    advanceStressDummies(dummies, 1.5);

    expect(dummies.map(({ x, z }) => `${x}:${z}`)).not.toEqual(initialPositions);
  });

  it("배열을 새로 만들지 않고 제자리에서 갱신한다", () => {
    const dummies = createStressDummies(4);
    const firstDummy = dummies[0];

    advanceStressDummies(dummies, 2);

    expect(dummies[0]).toBe(firstDummy);
  });

  it("궤도 접선 방향을 바라본다", () => {
    const dummies = createStressDummies(1);
    const [dummy] = dummies;
    const elapsedSeconds = 1.3;
    advanceStressDummies(dummies, elapsedSeconds);

    const angle = dummy.initialAngle + elapsedSeconds * dummy.angularSpeed;
    // 접선 (-sinθ, cosθ) 과 yaw 전방 (-sin(yaw), -cos(yaw)) 이 일치해야 한다.
    expect(-Math.sin(dummy.yaw)).toBeCloseTo(-Math.sin(angle), 6);
    expect(-Math.cos(dummy.yaw)).toBeCloseTo(Math.cos(angle), 6);
  });
});
