import { describe, expect, it } from "vitest";
import { type CullablePosition, selectNearestVisible } from "@/views/space/lib/avatarCulling";

const ORIGIN = { x: 0, z: 0 };

const createCandidate = (seat: number, x: number, z: number): CullablePosition => ({ seat, x, z });

const seatsOf = (candidates: readonly CullablePosition[]): number[] => {
  return candidates.map(({ seat }) => seat);
};

describe("selectNearestVisible", () => {
  it("최대 거리를 넘는 후보를 제외한다", () => {
    const selected = selectNearestVisible(
      [createCandidate(0, 10, 0), createCandidate(1, 30, 0)],
      ORIGIN,
      { maxDistance: 25, maxCount: 16 },
    );

    expect(seatsOf(selected)).toEqual([0]);
  });

  it("가까운 순으로 정렬한다", () => {
    const selected = selectNearestVisible(
      [createCandidate(0, 9, 0), createCandidate(1, 2, 0), createCandidate(2, 5, 0)],
      ORIGIN,
      { maxDistance: 25, maxCount: 16 },
    );

    expect(seatsOf(selected)).toEqual([1, 2, 0]);
  });

  it("개수 상한까지만 고른다", () => {
    const candidates = Array.from({ length: 50 }, (_, index) =>
      createCandidate(index, index * 0.1, 0),
    );
    const selected = selectNearestVisible(candidates, ORIGIN, { maxDistance: 25, maxCount: 16 });

    expect(selected).toHaveLength(16);
    expect(seatsOf(selected)).toEqual(Array.from({ length: 16 }, (_, index) => index));
  });

  it("거리가 같으면 좌석 번호 순으로 고정한다", () => {
    const selected = selectNearestVisible(
      [createCandidate(7, 0, 3), createCandidate(2, 3, 0), createCandidate(5, -3, 0)],
      ORIGIN,
      { maxDistance: 25, maxCount: 3 },
    );

    expect(seatsOf(selected)).toEqual([2, 5, 7]);
  });

  it("경계 거리의 후보는 포함한다", () => {
    const selected = selectNearestVisible([createCandidate(0, 25, 0)], ORIGIN, {
      maxDistance: 25,
      maxCount: 16,
    });

    expect(seatsOf(selected)).toEqual([0]);
  });

  it("원점 기준이 플레이어 위치를 따라간다", () => {
    const candidates = [createCandidate(0, 0, 0), createCandidate(1, 40, 0)];
    const selected = selectNearestVisible(
      candidates,
      { x: 38, z: 0 },
      {
        maxDistance: 25,
        maxCount: 16,
      },
    );

    expect(seatsOf(selected)).toEqual([1]);
  });

  it("상한이 0 이거나 후보가 없으면 빈 배열이다", () => {
    expect(
      selectNearestVisible([createCandidate(0, 1, 1)], ORIGIN, {
        maxDistance: 25,
        maxCount: 0,
      }),
    ).toEqual([]);
    expect(selectNearestVisible([], ORIGIN, { maxDistance: 25, maxCount: 16 })).toEqual([]);
  });
});
