import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS, type SpaceWeaponId } from "@/entities/space";
import { CREW_MODEL } from "./crewModel";
import { createWeaponGeometry, WEAPON } from "./weaponModel";

const PIVOT = [0.27, 0.76, 0] as const;
const WEAPONS: readonly SpaceWeaponId[] = ["wrench", "dogeCoin"];

describe.each(WEAPONS)("createWeaponGeometry(%s)", (weapon) => {
  const geometry = createWeaponGeometry(weapon, PIVOT);
  const positions = geometry.getAttribute("position");
  const offsets = geometry.getAttribute(WEAPON.offsetAttribute);
  const boneIndexes = geometry.getAttribute(CREW_MODEL.boneIndexAttribute);

  it("모든 정점을 오른손 본(13)에 묶음", () => {
    expect(boneIndexes.count).toBe(positions.count);
    for (let index = 0; index < boneIndexes.count; index += 1) {
      expect(boneIndexes.getX(index)).toBe(WEAPON.handBoneIndex);
    }
  });

  it("정점 위치 = 손 위치 + 손에서의 거리. 공격하지 않을 때 이 거리만큼 접어 손에 숨김", () => {
    for (let index = 0; index < positions.count; index += 1) {
      expect(positions.getX(index)).toBeCloseTo(PIVOT[0] + offsets.getX(index), 6);
      expect(positions.getY(index)).toBeCloseTo(PIVOT[1] + offsets.getY(index), 6);
      expect(positions.getZ(index)).toBeCloseTo(PIVOT[2] + offsets.getZ(index), 6);
    }
  });

  it("손 아래로 팔 방향을 따라 뻗음", () => {
    let lowestY = 0;
    for (let index = 0; index < offsets.count; index += 1) {
      lowestY = Math.min(lowestY, offsets.getY(index));
    }

    expect(lowestY).toBeLessThan(-0.4);
  });

  it("첫 상자(그립)는 손 위치 가까이 있음", () => {
    expect(Math.hypot(offsets.getX(0), offsets.getY(0), offsets.getZ(0))).toBeLessThan(0.1);
  });
});

describe("아바타별 무기", () => {
  it("머슼크만 도지코인이고 나머지는 렌치", () => {
    const weapons = Object.fromEntries(SPACE_AVATAR_MODELS.map(({ id, weapon }) => [id, weapon]));

    expect(weapons).toEqual({
      crew: "wrench",
      bear: "wrench",
      bull: "wrench",
      pepe: "wrench",
      elon: "dogeCoin",
      vitalik: "wrench",
    });
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

  it("렌치 그립은 비트코인 주황, 도지코인은 금색 동전", () => {
    const wrenchColors = createWeaponGeometry("wrench", PIVOT).getAttribute("color");
    const dogeColors = createWeaponGeometry("dogeCoin", PIVOT).getAttribute("color");

    // 주황: 빨강 > 초록 > 파랑
    expect(wrenchColors.getX(0)).toBeGreaterThan(wrenchColors.getY(0));
    expect(wrenchColors.getY(0)).toBeGreaterThan(wrenchColors.getZ(0));
    // 동전 면(세 번째 상자)의 금색: 빨강·초록이 파랑보다 큼.
    const coinVertex = 36 * 2;
    expect(dogeColors.getX(coinVertex)).toBeGreaterThan(dogeColors.getZ(coinVertex));
    expect(dogeColors.getY(coinVertex)).toBeGreaterThan(dogeColors.getZ(coinVertex));
  });
});
