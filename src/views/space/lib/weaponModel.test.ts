import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS, type SpaceWeaponId } from "@/entities/space";
import { CREW_MODEL } from "./crewModel";
import { createWeaponGeometry, DOGE_COIN, WEAPON } from "./weaponModel";

const PIVOT = [0.27, 0.76, 0] as const;
const WEAPONS: readonly SpaceWeaponId[] = ["wrench", "dogeCoin", "poop"];

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

  it("손이 쥐는 부분이 손 위치 가까이 있음", () => {
    let nearest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < offsets.count; index += 1) {
      nearest = Math.min(
        nearest,
        Math.hypot(offsets.getX(index), offsets.getY(index), offsets.getZ(index)),
      );
    }

    expect(nearest).toBeLessThan(0.1);
  });
});

describe("아바타별 무기", () => {
  it("머슼크는 도지코인, 빚탈릭은 똥, 나머지는 렌치", () => {
    const weapons = Object.fromEntries(SPACE_AVATAR_MODELS.map(({ id, weapon }) => [id, weapon]));

    expect(weapons).toEqual({
      crew: "wrench",
      bear: "wrench",
      bull: "wrench",
      pepe: "wrench",
      elon: "dogeCoin",
      vitalik: "poop",
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

  it("렌치 그립은 비트코인 주황", () => {
    const wrenchColors = createWeaponGeometry("wrench", PIVOT).getAttribute("color");

    // 주황: 빨강 > 초록 > 파랑
    expect(wrenchColors.getX(0)).toBeGreaterThan(wrenchColors.getY(0));
    expect(wrenchColors.getY(0)).toBeGreaterThan(wrenchColors.getZ(0));
  });
});

describe("도지코인 이미지 좌표", () => {
  const geometry = createWeaponGeometry("dogeCoin", PIVOT);
  const offsets = geometry.getAttribute(WEAPON.offsetAttribute);
  const normals = geometry.getAttribute("normal");
  const uvs = geometry.getAttribute("uv");
  const colors = geometry.getAttribute("color");

  it("정점 색은 흰색이라 이미지 색이 그대로 나옴", () => {
    for (let index = 0; index < colors.count; index += 1) {
      expect([colors.getX(index), colors.getY(index), colors.getZ(index)]).toEqual([1, 1, 1]);
    }
  });

  it("앞뒷면은 동전 가운데가 이미지 가운데, 위쪽이 이미지 위쪽", () => {
    for (let index = 0; index < uvs.count; index += 1) {
      if (Math.abs(normals.getZ(index)) < 0.5) {
        continue;
      }
      const dy = offsets.getY(index) - DOGE_COIN.centerY;
      expect(uvs.getY(index)).toBeCloseTo(0.5 + dy / (2 * DOGE_COIN.radius), 5);
      expect(uvs.getX(index)).toBeGreaterThanOrEqual(-1e-6);
      expect(uvs.getX(index)).toBeLessThanOrEqual(1 + 1e-6);
    }
  });

  it("앞(-Z)에서 본 오른쪽(-X)과 뒤(+Z)에서 본 오른쪽(+X)이 모두 이미지 오른쪽", () => {
    for (let index = 0; index < uvs.count; index += 1) {
      const normalZ = normals.getZ(index);
      if (Math.abs(normalZ) < 0.5) {
        continue;
      }
      const screenRight = normalZ < 0 ? -offsets.getX(index) : offsets.getX(index);
      expect(uvs.getX(index)).toBeCloseTo(0.5 + screenRight / (2 * DOGE_COIN.radius), 5);
    }
  });

  it("옆면은 테두리 색 한 점을 읽음", () => {
    for (let index = 0; index < uvs.count; index += 1) {
      if (Math.abs(normals.getZ(index)) >= 0.5) {
        continue;
      }
      expect(uvs.getX(index)).toBeCloseTo(DOGE_COIN.edgeUv[0], 5);
      expect(uvs.getY(index)).toBeCloseTo(DOGE_COIN.edgeUv[1], 5);
    }
  });
});
