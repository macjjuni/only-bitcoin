import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import type { BufferGeometry, Group, Material, Mesh, Object3D, Texture } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * 비트코인 아일랜드 맵 로더.
 *
 * 원본은 `bitcoin_island.blend` 이고, 복셀 → 메시 → GLB 로 굽는 파이썬
 * 스크립트가 따로 있다(저장소 밖). 여기서는 구운 결과를 읽어 three 객체로
 * 나눠 주는 일만 한다.
 *
 * GLB 가 드로우콜 7개로 이미 묶여 있고 머티리얼·발광·필터까지 전부 담고
 * 있어서, 런타임에서 할 일은 **지울 것을 지우고 꺼낼 것을 꺼내는 것**뿐이다.
 */

export const ISLAND_MODEL_URL = "/models/bitcoin_island_draco.glb";

/**
 * Draco 디코더 경로.
 *
 * `node_modules/three/examples/jsm/libs/draco/gltf` 를 `public/draco` 로 복사해
 * 둔다. 외부 호스트가 끼면 CSP·오프라인·차단 환경에서 맵이 통째로 실패한다.
 */
export const DRACO_DECODER_PATH = "/draco/";

/**
 * 로더를 **three 번들에서 직접** 가져온다.
 *
 * drei 의 `useGLTF` 는 `three-stdlib` 의 `GLTFLoader`·`DRACOLoader` 를 쓰는데,
 * 그 쪽이 기대하는 디코더는 Draco **1.5.5**(drei 기본값인 gstatic CDN 경로)다.
 * `public/draco` 에 둔 파일은 three 0.187 이 들고 온 **더 새 세대**라 워커 안에서
 * 서로 맞지 않는다. 그런데 실패가 예외로 올라오지 않고 **promise 가 영영 풀리지
 * 않는** 형태라, 화면에는 섬만 안 보이고 콘솔은 조용하다 — 찾기 가장 나쁜 종류의
 * 고장이다.
 *
 * 로더와 디코더를 같은 번들로 묶으면 세대가 어긋날 자리가 없어진다. 아바타는
 * Draco 를 쓰지 않아 계속 `useGLTF` 를 쓴다.
 */
const extendWithDracoDecoder = (loader: GLTFLoader): void => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(dracoLoader);
};

/** GLB 안의 노드 이름. 굽는 스크립트와 **같은 문자열**이어야 한다. */
export const ISLAND_NODE_NAMES = {
  collision: "Collision",
  blocks: "Island_Blocks",
  glow: "Island_Glow",
  waterfalls: "Waterfalls",
  ocean: "Ocean",
  /** 실시간 패널로 갈아끼우므로 숨긴다. GLB 의 것은 구울 때 박은 정지 화면이다. */
  screens: ["Screen_BTCUSD", "Screen_Network"],
  lanternPrefix: "Light_Lantern_",
} as const;

export type LanternAnchor = readonly [number, number, number];

export interface IslandModel {
  /** 씬 그래프 전체. `<primitive>` 로 그대로 붙인다. */
  scene: Group;
  /** 충돌 전용 메시의 지오메트리. BVH 를 여기에 씌운다. */
  collisionGeometry: BufferGeometry;
  /** 폭포 재질의 텍스처. 매 프레임 `offset.y` 를 흘려 물이 떨어지게 한다. */
  waterfallMaps: readonly Texture[];
  /** 랜턴 포인트라이트를 둘 만한 위치 20곳. */
  lanternAnchors: readonly LanternAnchor[];
}

// region [Privates]
const isMesh = (object: Object3D): object is Mesh => {
  return (object as Mesh).isMesh === true;
};

/** 머티리얼이 배열일 수 있다. 이 맵은 전부 단일이지만 타입은 둘 다 허용한다. */
const toMaterials = (material: Material | Material[]): Material[] => {
  return Array.isArray(material) ? material : [material];
};

/**
 * 폭포 재질에서 흘릴 텍스처를 모은다.
 *
 * glTF 로더가 `(이미지, 샘플러)` 쌍으로 텍스처를 캐시하므로 `map` 과
 * `emissiveMap` 이 같은 객체일 수 있다. 같은 것을 두 번 흘리면 속도가 두 배가
 * 되므로 `Set` 으로 거른다.
 */
const collectWaterfallMaps = (material: Material): Texture[] => {
  const candidate = material as Material & { map?: Texture | null; emissiveMap?: Texture | null };

  return [...new Set([candidate.map, candidate.emissiveMap].filter(Boolean))] as Texture[];
};
// endregion

/**
 * GLB 를 읽어 씬·충돌·폭포·랜턴으로 나눈다.
 *
 * **씬 그래프를 제자리에서 고친다.** drei 의 캐시가 이 씬을 들고 있어서 사본을
 * 만들면 맵 하나가 메모리에 두 벌 남는다. 맵은 화면에 하나뿐이고 고치는 내용이
 * 멱등(숨기기·플래그)이라, 캐시된 원본을 그대로 쓰는 쪽을 택했다.
 */
export const useIslandModel = (): IslandModel => {
  const { scene } = useLoader(GLTFLoader, ISLAND_MODEL_URL, extendWithDracoDecoder);

  return useMemo((): IslandModel => {
    let collisionGeometry: BufferGeometry | null = null;
    const waterfallMaps: Texture[] = [];
    const lanternAnchors: LanternAnchor[] = [];

    scene.traverse((object) => {
      if (object.name.startsWith(ISLAND_NODE_NAMES.lanternPrefix)) {
        lanternAnchors.push([object.position.x, object.position.y, object.position.z]);
        return;
      }

      if (!isMesh(object)) {
        return;
      }

      if (object.name === ISLAND_NODE_NAMES.collision) {
        collisionGeometry = object.geometry;
        // 그리지 않는다. 레이캐스트와 BVH 만 쓰는 메시다.
        object.visible = false;
        return;
      }

      if ((ISLAND_NODE_NAMES.screens as readonly string[]).includes(object.name)) {
        object.visible = false;
        return;
      }

      if (object.name === ISLAND_NODE_NAMES.waterfalls) {
        waterfallMaps.push(...toMaterials(object.material).flatMap(collectWaterfallMaps));
      }
    });

    if (!collisionGeometry) {
      throw new Error(
        `맵 GLB 에 '${ISLAND_NODE_NAMES.collision}' 메시가 없습니다. 굽는 스크립트가 바뀌었는지 확인하세요.`,
      );
    }

    // 랜턴은 노드 이름 순서로 들어오지만 순서가 의미를 갖지 않는다. 조명이
    // 가까운 순으로 고르므로 여기서 정렬할 이유가 없다.
    return { scene, collisionGeometry, waterfallMaps, lanternAnchors };
  }, [scene]);
};

useLoader.preload(GLTFLoader, ISLAND_MODEL_URL, extendWithDracoDecoder);
