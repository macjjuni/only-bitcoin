import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  type Material,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SpaceWeaponId } from "@/entities/space";
import { CREW_MODEL } from "./crewModel";
import {
  applyCrewSkinning,
  type CrewInstanceGeometry,
  createCrewInstanceGeometry,
} from "./crewSkinning";
import { toVersionedModelUrl } from "./modelAssetUrl";

/**
 * 공격할 때 손에 나타나는 무기. 기본은 렌치, 머슼크는 도지코인, 빚탈릭은 똥,
 * 세일러문은 비트코인 동전.
 *
 * 모델 파일에 넣지 않고 코드에서 만듦. 모든 아바타 모델이 오른손을 같은 본 번호(13)로
 * 가져서, 정점을 그 본에 묶으면 걷기·공격 행렬을 그대로 따라 움직임.
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

/** 렌치. 강철 손잡이·스패너 머리에 비트코인 주황 그립. 첫 상자는 손이 쥐는 그립. */
const WRENCH_PARTS: readonly WeaponPart[] = [
  { center: [0, -0.02, 0], size: [0.06, 0.12, 0.06], color: "#f7931a" },
  { center: [0, -0.2, 0], size: [0.045, 0.26, 0.045], color: STEEL_HANDLE },
  // 머리 뒤판. 앞쪽(-Z)으로 두 갈래가 벌어짐.
  { center: [0, -0.37, 0.015], size: [0.06, 0.09, 0.05], color: STEEL_HEAD },
  { center: [0, -0.42, -0.035], size: [0.06, 0.03, 0.07], color: STEEL_HEAD },
  { center: [0, -0.33, -0.035], size: [0.06, 0.03, 0.07], color: STEEL_HEAD },
];

const POOP_BROWN = "#8a5a2b";
const POOP_DARK = "#6e4520";

/**
 * 빚탈릭 손에 쥔 💩. "똥코인" 개그.
 *
 * 소용돌이 끝이 팔 방향으로 뻗어 머리 위로 들면 똑바로 선 똥이 됨. 몸 안쪽(-X, 손바닥 쪽)으로
 * 비켜 붙여 손바닥이 밑단 옆을 쥐는 모양임. 손 한가운데 꽂으면 팔이 똥 꽂은 막대처럼 보였음.
 * 단마다 상자 둘을 십자로 겹쳐 둥글게 보이게 함. 눈·입은 앞뒤 양쪽에 붙여
 * 앞사람에게도, 뒤따르는 카메라에도 얼굴이 보임.
 */
const POOP_SCALE = 0.7;
const POOP_SHIFT_X = -0.09;

const POOP_SHAPE: readonly WeaponPart[] = [
  // 밑단·가운데단·윗단·끝. 아래(-Y)로 갈수록 좁아짐.
  { center: [0, -0.08, 0], size: [0.34, 0.12, 0.24], color: POOP_BROWN },
  { center: [0, -0.08, 0], size: [0.24, 0.12, 0.34], color: POOP_BROWN },
  { center: [0, -0.19, 0], size: [0.26, 0.11, 0.18], color: POOP_DARK },
  { center: [0, -0.19, 0], size: [0.18, 0.11, 0.26], color: POOP_DARK },
  { center: [0, -0.29, 0], size: [0.18, 0.1, 0.12], color: POOP_BROWN },
  { center: [0, -0.29, 0], size: [0.12, 0.1, 0.18], color: POOP_BROWN },
  { center: [0, -0.37, 0], size: [0.08, 0.07, 0.08], color: POOP_DARK },
  { center: [0.025, -0.42, 0], size: [0.04, 0.05, 0.04], color: POOP_DARK },
  ...[-1, 1].flatMap((side): WeaponPart[] => [
    // 흰자·눈동자(가운데단), 웃는 입·이(밑단).
    { center: [-0.05, -0.19, side * 0.135], size: [0.06, 0.06, 0.01], color: "#ffffff" },
    { center: [0.05, -0.19, side * 0.135], size: [0.06, 0.06, 0.01], color: "#ffffff" },
    { center: [-0.05, -0.2, side * 0.142], size: [0.03, 0.03, 0.01], color: "#1b1b1b" },
    { center: [0.05, -0.2, side * 0.142], size: [0.03, 0.03, 0.01], color: "#1b1b1b" },
    { center: [0, -0.1, side * 0.175], size: [0.16, 0.05, 0.01], color: "#2b1a0c" },
    { center: [0, -0.09, side * 0.18], size: [0.12, 0.02, 0.01], color: "#ffffff" },
  ]),
];

/** 모양은 원래 크기로 적고 줄여서 손 바깥쪽으로 비킴. */
const POOP_PARTS: readonly WeaponPart[] = POOP_SHAPE.map(({ center, size, color }) => ({
  center: [center[0] * POOP_SCALE + POOP_SHIFT_X, center[1] * POOP_SCALE, center[2] * POOP_SCALE],
  size: [size[0] * POOP_SCALE, size[1] * POOP_SCALE, size[2] * POOP_SCALE],
  color,
}));

/**
 * 손에 쥔 큰 도지코인. 손이 동전 윗테를 잡음.
 *
 * 면이 앞뒤(±Z)를 봐서 뒤따르는 카메라에 내 동전 얼굴이 보임.
 * 앞뒷면에 `scripts/bake-doge-coin.mjs` 가 구운 시바 동전 이미지를 입힘.
 */
export interface CoinSpec {
  radius: number;
  thickness: number;
  /** 손 위치 기준 동전 가운데 높이. 윗테가 손에 살짝 걸침. */
  centerY: number;
  segments: number;
  textureUrl: string;
  /** 옆면이 읽는 텍스처 좌표. 이미지 맨 위 가운데 테두리 색. */
  edgeUv: readonly [number, number];
}

export const DOGE_COIN: CoinSpec = {
  radius: 0.22,
  thickness: 0.04,
  centerY: -0.2,
  segments: 40,
  textureUrl: "/models/doge-coin.webp",
  edgeUv: [0.5, 0.99],
};

/**
 * 세일러문 손에 쥔 비트코인 동전.
 *
 * 도지코인과 같은 규격임. 앞뒷면 그림만 `scripts/bake-bitcoin-coin.mjs` 가 구운
 * ₿ 동전으로 다름. 크기가 같아야 둘 중 뭘 들어도 사거리가 같아 보임.
 */
export const BITCOIN_COIN: CoinSpec = {
  ...DOGE_COIN,
  textureUrl: "/models/bitcoin-coin.webp",
};

/** 원기둥으로 그리는 무기. 여기 없는 무기는 상자를 쌓아 만듦. */
const COIN_SPECS: Partial<Record<SpaceWeaponId, CoinSpec>> = {
  dogeCoin: DOGE_COIN,
  bitcoinCoin: BITCOIN_COIN,
};

const WEAPON_TEXTURE_URLS: Partial<Record<SpaceWeaponId, string>> = {
  dogeCoin: DOGE_COIN.textureUrl,
  bitcoinCoin: BITCOIN_COIN.textureUrl,
};

const WEAPON_SURFACES: Record<SpaceWeaponId, { roughness: number; metalness: number }> = {
  wrench: { roughness: 0.42, metalness: 0.55 },
  // 금속감을 낮춰야 환경광 없이도 그림이 어둡게 묻히지 않음.
  dogeCoin: { roughness: 0.4, metalness: 0.25 },
  bitcoinCoin: { roughness: 0.4, metalness: 0.25 },
  poop: { roughness: 0.75, metalness: 0 },
};

// region [Privates]
/** 상자 목록을 정점 색이 든 지오메트리 하나로 합침. */
const createPartsGeometry = (parts: readonly WeaponPart[]): BufferGeometry => {
  const color = new Color();
  const boxes = parts.map(({ center, size, color: hex }) => {
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
  const geometry = mergeGeometries(boxes);

  if (!geometry) {
    throw new Error("무기 상자 지오메트리를 합치지 못했습니다.");
  }

  return geometry;
};

/**
 * 도지코인 원기둥. 앞뒷면은 이미지가 똑바로 보이게 UV 를 다시 매기고 옆면은 테두리 색 한 점을 읽음.
 *
 * 앞(-Z)에서 보면 화면 오른쪽이 -X, 뒤(+Z)에서 보면 +X 라 면마다 u 방향을 뒤집음.
 * 정점 색은 흰색이라 텍스처 색이 그대로 나옴.
 */
const createCoinGeometry = (spec: CoinSpec): BufferGeometry => {
  const { radius, thickness, centerY, segments, edgeUv } = spec;
  const coin = new CylinderGeometry(radius, radius, thickness, segments).toNonIndexed();
  coin.rotateX(Math.PI / 2);
  coin.translate(0, centerY, 0);

  const positions = coin.getAttribute("position");
  const normals = coin.getAttribute("normal");
  const uvs = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    const normalZ = normals.getZ(index);
    if (Math.abs(normalZ) < 0.5) {
      uvs.set(edgeUv, index * 2);
      continue;
    }
    const side = Math.sign(normalZ);
    uvs[index * 2] = 0.5 + (side * positions.getX(index)) / (2 * radius);
    uvs[index * 2 + 1] = 0.5 + (positions.getY(index) - centerY) / (2 * radius);
  }
  coin.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  coin.setAttribute(
    "color",
    new Float32BufferAttribute(new Float32Array(positions.count * 3).fill(1), 3),
  );
  coin.clearGroups();

  return coin;
};

/** 무기 텍스처. 주소마다 한 장만 불러 내 아바타·남 아바타가 같이 씀. 정리하지 않음. */
const weaponTextures = new Map<string, Texture>();

const loadWeaponTexture = (url: string): Texture => {
  const cached = weaponTextures.get(url);
  if (cached) {
    return cached;
  }

  // 불러오는 동안은 빈 텍스처라 동전이 잠깐 검게 보일 수 있음. 휘두를 때만 보여 그대로 둠.
  const texture = new TextureLoader().load(toVersionedModelUrl(url));
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  weaponTextures.set(url, texture);

  return texture;
};
// endregion

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
  const coinSpec = COIN_SPECS[weapon];
  const geometry = coinSpec
    ? createCoinGeometry(coinSpec)
    : createPartsGeometry(weapon === "poop" ? POOP_PARTS : WRENCH_PARTS);

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
 * 재질은 정점 색(+도지코인은 이미지)을 쓰는 금속 재질에 걷기·공격 셰이더를 심고
 * 무기 접기(`isWeapon`)를 켬. 언마운트·모델 변경 때 직접 만든 버퍼와 재질을 정리함.
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
    const textureUrl = WEAPON_TEXTURE_URLS[weapon];
    const weaponMaterial = new MeshStandardMaterial({
      vertexColors: true,
      map: textureUrl ? loadWeaponTexture(textureUrl) : null,
      ...WEAPON_SURFACES[weapon],
    });
    applyCrewSkinning(weaponMaterial, walkTexture, kickTexture, true);
    return weaponMaterial;
  }, [weapon, walkTexture, kickTexture]);

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
