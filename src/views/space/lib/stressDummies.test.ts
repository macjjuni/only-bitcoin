import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_COLORS, SPACE_ISLAND, SPACE_MAX_OCCUPANTS } from "@/entities/space";
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

  it("슬롯 상한을 넘는 요청은 50명 측정과 같은 더미를 만든다", () => {
    expect(createStressDummies(SPACE_MAX_OCCUPANTS * 2)).toEqual(
      createStressDummies(SPACE_MAX_OCCUPANTS),
    );
  });

  it("비유한 입력은 생성하지 않고 소수 인원은 정수로 내린다", () => {
    expect(createStressDummies(Number.NaN)).toEqual([]);
    expect(createStressDummies(Number.POSITIVE_INFINITY)).toEqual([]);
    expect(createStressDummies(Number.NEGATIVE_INFINITY)).toEqual([]);
    expect(createStressDummies(2.9)).toEqual(createStressDummies(2));
  });

  it("궤도 중심이 한곳에 뭉치지 않는다", () => {
    const dummies = createStressDummies(SPACE_MAX_OCCUPANTS);
    const averageX =
      dummies.reduce((total, { orbitCenterX }) => total + orbitCenterX, 0) / dummies.length;
    const spreadX = Math.max(
      ...dummies.map(({ orbitCenterX }) => Math.abs(orbitCenterX - averageX)),
    );

    expect(spreadX).toBeGreaterThan(5);
  });
});

describe("advanceStressDummies", () => {
  it("어느 시점에서도 광장 밖으로 나가지 않는다", () => {
    // 더미는 지형을 보지 않는다. 광장 밖으로 나가면 원형극장 계단이나 바다에
    // 떠서, 재려던 렌더 비용 대신 프러스텀 컬링 결과를 재게 된다.
    const dummies = createStressDummies(SPACE_MAX_OCCUPANTS);

    for (const elapsedSeconds of [0, 0.5, 3, 17, 120]) {
      advanceStressDummies(dummies, elapsedSeconds);

      for (const dummy of dummies) {
        expect(Math.hypot(dummy.x, dummy.z)).toBeLessThanOrEqual(12 + 1e-9);
      }
    }
  });

  it("광장 바닥 높이에 선다", () => {
    for (const dummy of createStressDummies(SPACE_MAX_OCCUPANTS)) {
      expect(dummy.y).toBe(SPACE_ISLAND.plazaY);
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
