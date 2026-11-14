import { describe, expect, it } from "vitest";
import { resolveBaristaProximity, SPACE_BARISTA } from "./barista";

const at = (distance: number, heightOffset = 0) => ({
  x: SPACE_BARISTA.x,
  y: SPACE_BARISTA.y + heightOffset,
  z: SPACE_BARISTA.z - distance,
});

describe("바리스타에게 말 걸 수 있는 자리", () => {
  it("가까이 가면 말을 걸 수 있고 멀면 못 건다", () => {
    expect(resolveBaristaProximity(false, at(SPACE_BARISTA.talkRadius - 0.1))).toBe(true);
    expect(resolveBaristaProximity(false, at(SPACE_BARISTA.talkRadius + 0.1))).toBe(false);
    expect(resolveBaristaProximity(false, null)).toBe(false);
  });

  it("가까이 있던 사람은 조금 더 멀어져야 벗어난다", () => {
    expect(resolveBaristaProximity(true, at(SPACE_BARISTA.talkRadius + 0.1))).toBe(true);
    expect(resolveBaristaProximity(true, at(SPACE_BARISTA.leaveRadius + 0.1))).toBe(false);
  });

  it("바로 위 발코니에 선 사람은 빠진다", () => {
    expect(resolveBaristaProximity(false, at(1, SPACE_BARISTA.heightTolerance + 0.5))).toBe(false);
  });
});
