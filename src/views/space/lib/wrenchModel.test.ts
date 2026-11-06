import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS } from "@/entities/space";
import { CREW_MODEL } from "./crewModel";
import { createWrenchGeometry, WRENCH } from "./wrenchModel";

describe("createWrenchGeometry", () => {
  const pivot = [0.27, 0.76, 0] as const;
  const geometry = createWrenchGeometry(pivot);
  const positions = geometry.getAttribute("position");
  const offsets = geometry.getAttribute(WRENCH.offsetAttribute);
  const boneIndexes = geometry.getAttribute(CREW_MODEL.boneIndexAttribute);

  it("모든 정점을 오른손 본(13)에 묶음", () => {
    expect(boneIndexes.count).toBe(positions.count);
    for (let index = 0; index < boneIndexes.count; index += 1) {
      expect(boneIndexes.getX(index)).toBe(WRENCH.handBoneIndex);
    }
  });

  it("정점 위치 = 손 위치 + 손에서의 거리. 공격하지 않을 때 이 거리만큼 접어 손에 숨김", () => {
    for (let index = 0; index < positions.count; index += 1) {
      expect(positions.getX(index)).toBeCloseTo(pivot[0] + offsets.getX(index), 6);
      expect(positions.getY(index)).toBeCloseTo(pivot[1] + offsets.getY(index), 6);
      expect(positions.getZ(index)).toBeCloseTo(pivot[2] + offsets.getZ(index), 6);
    }
  });

  it("손 아래로 팔 방향을 따라 뻗고 머리는 앞(-Z)으로 벌어짐", () => {
    let lowestY = 0;
    let frontMostZ = 0;
    for (let index = 0; index < offsets.count; index += 1) {
      lowestY = Math.min(lowestY, offsets.getY(index));
      frontMostZ = Math.min(frontMostZ, offsets.getZ(index));
    }

    expect(lowestY).toBeLessThan(-0.4);
    expect(frontMostZ).toBeLessThan(-0.05);
  });

  it("손이 쥐는 그립은 비트코인 주황", () => {
    const colors = geometry.getAttribute("color");
    // 첫 상자가 그립. 손 위치 가까이(거리 0.1 안)에 있음.
    expect(Math.hypot(offsets.getX(0), offsets.getY(0), offsets.getZ(0))).toBeLessThan(0.1);
    expect(colors.getX(0)).toBeGreaterThan(colors.getZ(0));
    expect(colors.getY(0)).toBeGreaterThan(colors.getZ(0));
  });

  it("모든 아바타 모델에 손 위치가 있음", () => {
    for (const model of SPACE_AVATAR_MODELS) {
      expect(model.handPivot).toHaveLength(3);
      // 오른손이라 +x 쪽, 허리 높이쯤.
      expect(model.handPivot[0]).toBeGreaterThan(0);
      expect(model.handPivot[1]).toBeGreaterThan(0.4);
      expect(model.handPivot[1]).toBeLessThan(model.headCenterY);
    }
  });
});
