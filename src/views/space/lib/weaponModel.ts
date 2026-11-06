import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  MeshStandardMaterial,
  type Texture,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SpaceWeaponId } from "@/entities/space";
import { CREW_MODEL } from "./crewModel";
import {
  applyCrewSkinning,
  type CrewInstanceGeometry,
  createCrewInstanceGeometry,
} from "./crewSkinning";

/**
 * 공격할 때 손에 나타나는 무기. 기본은 렌치, 머슼크만 도지코인.
 *
 * 모델 파일에 넣지 않고 복셀 상자 몇 개로 코드에서 만듦. 모든 아바타 모델이 오른손을 같은
 * 본 번호(13)로 가져서, 정점을 그 본에 묶으면 걷기·공격 행렬을 그대로 따라 움직임.
 * 크기는 모델 좌표(m, 배율 전)이고 아바타 배율은 그릴 때 같이 곱해짐.
 *
 * 팔 방향의 연장선으로 붙임(레스트에서 손 아래로 뻗음). 팔이 머리 위로 가면 머리 뒤로
 * 넘어가고, 앞쪽 아래로 내려치면 무기 끝이 앞쪽 아래를 향함. 팔과 직각으로 붙였을 때는
 * 내려칠 때 끝이 위로 들려 휘두르는 느낌이 안 났음.
 */
export const WEAPON = {
  /** 오른손 본 번호. 가공 스크립트 본 순서에서 `hand.R`. */
  handBoneIndex: 13,
  /** 정점이 손 위치에서 얼마나 떨어져 있는지. 공격하지 않을 때 이만큼 접어 손에 숨김. */
  offsetAttribute: "aWeaponOffset",
} as const;

interface WeaponPart {
  /** 손 위치 기준 가운데(m). 앞은 -Z, 위는 +Y. */
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  color: string;
}

const STEEL_HANDLE = "#8f98a3";
const STEEL_HEAD = "#c9d1da";
const DOGE_GOLD = "#c2a633";
const DOGE_MARK = "#7a6414";

/**
 * 무기별 상자 목록. 첫 상자는 손이 쥐는 그립이고 손보다 살짝 두꺼워 주먹 밖으로 보임.
 */
const WEAPON_PARTS: Record<SpaceWeaponId, readonly WeaponPart[]> = {
  /** 강철 손잡이·스패너 머리에 비트코인 주황 그립. */
  wrench: [
    { center: [0, -0.02, 0], size: [0.06, 0.12, 0.06], color: "#f7931a" },
    { center: [0, -0.2, 0], size: [0.045, 0.26, 0.045], color: STEEL_HANDLE },
    // 머리 뒤판. 앞쪽(-Z)으로 두 갈래가 벌어짐.
    { center: [0, -0.37, 0.015], size: [0.06, 0.09, 0.05], color: STEEL_HEAD },
    { center: [0, -0.42, -0.035], size: [0.06, 0.03, 0.07], color: STEEL_HEAD },
    { center: [0, -0.33, -0.035], size: [0.06, 0.03, 0.07], color: STEEL_HEAD },
  ],
  /**
   * 막대 끝에 세운 금색 도지코인. 옆에서 보면 동전 면이 보임.
   *
   * 납작한 상자 둘을 십자로 겹쳐 팔각형으로 둥글게 보이게 함. 면에는 "Ð" 를 진한 금색으로
   * 새김(세로 줄기 + 가로줄 + 앞쪽으로 닫힌 둥근 쪽).
   */
  dogeCoin: [
    { center: [0, -0.02, 0], size: [0.06, 0.12, 0.06], color: "#6b4f2a" },
    { center: [0, -0.2, 0], size: [0.045, 0.24, 0.045], color: STEEL_HANDLE },
    { center: [0, -0.45, 0], size: [0.035, 0.27, 0.18], color: DOGE_GOLD },
    { center: [0, -0.45, 0], size: [0.035, 0.18, 0.27], color: DOGE_GOLD },
    // "Ð" 줄기·가로줄·위아래·앞쪽 둥근 면. 동전보다 살짝 두꺼워 양면에 보임.
    { center: [0, -0.45, 0.04], size: [0.045, 0.15, 0.03], color: DOGE_MARK },
    { center: [0, -0.45, 0.04], size: [0.045, 0.025, 0.08], color: DOGE_MARK },
    { center: [0, -0.385, 0.0], size: [0.045, 0.025, 0.08], color: DOGE_MARK },
    { center: [0, -0.515, 0.0], size: [0.045, 0.025, 0.08], color: DOGE_MARK },
    { center: [0, -0.45, -0.05], size: [0.045, 0.11, 0.025], color: DOGE_MARK },
  ],
};

/**
 * 모델 하나의 무기 지오메트리.
 *
 * 걷기 셰이더가 쓰는 본 번호 속성과, 손 위치에서의 거리(`aWeaponOffset`)를 같이 담음.
 * 셰이더는 공격 진행도만큼 이 거리를 펼쳐 무기가 손에서 자라나듯 보이게 함.
 */
export const createWeaponGeometry = (
  weapon: SpaceWeaponId,
  handPivot: readonly [number, number, number],
): BufferGeometry => {
  const color = new Color();
  const parts = WEAPON_PARTS[weapon].map(({ center, size, color: hex }) => {
    const box = new BoxGeometry(size[0], size[1], size[2]).toNonIndexed();
    box.translate(center[0], center[1], center[2]);

    const vertexCount = box.getAttribute("position").count;
    const colors = new Float32Array(vertexCount * 3);
    color.set(hex);
    for (let index = 0; index < vertexCount; index += 1) {
      colors.set([color.r, color.g, color.b], index * 3);
    }
    box.setAttribute("color", new Float32BufferAttribute(colors, 3));
    box.deleteAttribute("uv");

    return box;
  });
  const geometry = mergeGeometries(parts);

  if (!geometry) {
    throw new Error(`무기(${weapon}) 지오메트리를 합치지 못했습니다.`);
  }

  // 지금 위치가 곧 손에서의 거리임. 손 위치로 옮기기 전에 떠 둠.
  const offsets = (geometry.getAttribute("position").array as Float32Array).slice();
  geometry.setAttribute(WEAPON.offsetAttribute, new Float32BufferAttribute(offsets, 3));
  geometry.translate(handPivot[0], handPivot[1], handPivot[2]);

  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute(
    CREW_MODEL.boneIndexAttribute,
    new Float32BufferAttribute(new Float32Array(vertexCount).fill(WEAPON.handBoneIndex), 1),
  );

  return geometry;
};

/**
 * 무기 인스턴스 버퍼와 재질. 내 아바타(1칸)와 남 아바타 묶음(50칸)이 같이 씀.
 *
 * 재질은 정점 색을 쓰는 금속 재질에 걷기·공격 셰이더를 심고 무기 접기(`isWeapon`)를 켬.
 * 언마운트·모델 변경 때 직접 만든 버퍼와 재질을 정리함.
 */
export const useWeapon = (
  weapon: SpaceWeaponId,
  handPivot: readonly [number, number, number],
  capacity: number,
  walkTexture: Texture,
  kickTexture: Texture,
): { buffers: CrewInstanceGeometry; material: Material } => {
  const [pivotX, pivotY, pivotZ] = handPivot;
  const buffers = useMemo(() => {
    const source = createWeaponGeometry(weapon, [pivotX, pivotY, pivotZ]);
    const instance = createCrewInstanceGeometry(source, capacity);
    source.dispose();
    return instance;
  }, [weapon, pivotX, pivotY, pivotZ, capacity]);
  const material = useMemo(() => {
    const weaponMaterial = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.55,
    });
    applyCrewSkinning(weaponMaterial, walkTexture, kickTexture, true);
    return weaponMaterial;
  }, [walkTexture, kickTexture]);

  useEffect(() => {
    return () => {
      buffers.geometry.dispose();
    };
  }, [buffers]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return { buffers, material };
};
