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
import { CREW_MODEL } from "./crewModel";
import {
  applyCrewSkinning,
  type CrewInstanceGeometry,
  createCrewInstanceGeometry,
} from "./crewSkinning";

/**
 * 렌치 공격 때 손에 나타나는 렌치.
 *
 * 모델 파일에 넣지 않고 복셀 상자 몇 개로 코드에서 만듦. 모든 아바타 모델이 오른손을 같은
 * 본 번호(13)로 가져서, 정점을 그 본에 묶으면 걷기·공격 행렬을 그대로 따라 움직임.
 * 크기는 모델 좌표(m, 배율 전)이고 아바타 배율은 그릴 때 같이 곱해짐.
 *
 * 팔 방향의 연장선으로 붙임(레스트에서 손 아래로 뻗음). 팔이 머리 위로 가면 머리 뒤로
 * 넘어가고, 앞쪽 아래로 내려치면 렌치 머리가 앞쪽 아래를 향함. 팔과 직각으로 붙였을 때는
 * 내려칠 때 머리가 위로 들려 휘두르는 느낌이 안 났음.
 */
export const WRENCH = {
  /** 오른손 본 번호. 가공 스크립트 본 순서에서 `hand.R`. */
  handBoneIndex: 13,
  /** 정점이 손 위치에서 얼마나 떨어져 있는지. 공격하지 않을 때 이만큼 접어 손에 숨김. */
  offsetAttribute: "aWrenchOffset",
} as const;

interface WrenchPart {
  /** 손 위치 기준 가운데(m). 앞은 -Z, 위는 +Y. */
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  color: string;
}

/** 강철 손잡이·머리와 손이 쥐는 비트코인 주황 그립. */
const WRENCH_PARTS: readonly WrenchPart[] = [
  // 손 안에 쥐는 그립. 손보다 살짝 두꺼워야 주먹 밖으로 색이 보임.
  { center: [0, -0.02, 0], size: [0.06, 0.12, 0.06], color: "#f7931a" },
  // 손잡이.
  { center: [0, -0.2, 0], size: [0.045, 0.26, 0.045], color: "#8f98a3" },
  // 머리 뒤판. 앞쪽(-Z)으로 두 갈래가 벌어진 스패너 모양.
  { center: [0, -0.37, 0.015], size: [0.06, 0.09, 0.05], color: "#c9d1da" },
  { center: [0, -0.42, -0.035], size: [0.06, 0.03, 0.07], color: "#c9d1da" },
  { center: [0, -0.33, -0.035], size: [0.06, 0.03, 0.07], color: "#c9d1da" },
];

/**
 * 모델 하나의 렌치 지오메트리.
 *
 * 걷기 셰이더가 쓰는 본 번호 속성과, 손 위치에서의 거리(`aWrenchOffset`)를 같이 담음.
 * 셰이더는 공격 진행도만큼 이 거리를 펼쳐 렌치가 손에서 자라나듯 보이게 함.
 */
export const createWrenchGeometry = (
  handPivot: readonly [number, number, number],
): BufferGeometry => {
  const color = new Color();
  const parts = WRENCH_PARTS.map(({ center, size, color: hex }) => {
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
    throw new Error("렌치 지오메트리를 합치지 못했습니다.");
  }

  // 지금 위치가 곧 손에서의 거리임. 손 위치로 옮기기 전에 떠 둠.
  const offsets = (geometry.getAttribute("position").array as Float32Array).slice();
  geometry.setAttribute(WRENCH.offsetAttribute, new Float32BufferAttribute(offsets, 3));
  geometry.translate(handPivot[0], handPivot[1], handPivot[2]);

  const vertexCount = geometry.getAttribute("position").count;
  geometry.setAttribute(
    CREW_MODEL.boneIndexAttribute,
    new Float32BufferAttribute(new Float32Array(vertexCount).fill(WRENCH.handBoneIndex), 1),
  );

  return geometry;
};

/**
 * 렌치 인스턴스 버퍼와 재질. 내 아바타(1칸)와 남 아바타 묶음(50칸)이 같이 씀.
 *
 * 재질은 정점 색을 쓰는 금속 재질에 걷기·공격 셰이더를 심고 렌치 접기(`isWrench`)를 켬.
 * 언마운트·모델 변경 때 직접 만든 버퍼와 재질을 정리함.
 */
export const useWrench = (
  handPivot: readonly [number, number, number],
  capacity: number,
  walkTexture: Texture,
  kickTexture: Texture,
): { buffers: CrewInstanceGeometry; material: Material } => {
  const [pivotX, pivotY, pivotZ] = handPivot;
  const buffers = useMemo(() => {
    const source = createWrenchGeometry([pivotX, pivotY, pivotZ]);
    const instance = createCrewInstanceGeometry(source, capacity);
    source.dispose();
    return instance;
  }, [pivotX, pivotY, pivotZ, capacity]);
  const material = useMemo(() => {
    const wrenchMaterial = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.55,
    });
    applyCrewSkinning(wrenchMaterial, walkTexture, kickTexture, true);
    return wrenchMaterial;
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
