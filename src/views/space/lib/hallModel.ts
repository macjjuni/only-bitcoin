import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  type BufferGeometry,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type Object3D,
  SRGBColorSpace,
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SPACE_HALL } from "@/entities/space";
import { toVersionedModelUrl } from "./modelAssetUrl";

/**
 * 비트코인 홀 맵 로더.
 *
 * 원본은 `bitcoin_hall.blend` 이고 굽는 파이썬 스크립트는 저장소 밖에 있음.
 * 조명은 텍스처에 구워져 있어서, 런타임 할 일은 머티리얼을 언릿으로 바꾸고
 * 충돌·램프 자리를 꺼내는 것뿐임. 맵 동봉 `bitcoinHall.js` 의 `setupHall` 을 옮겨 왔음.
 *
 * 맵 파일은 블렌더에서 WebP · Draco(위치 14 · 노멀 10 · UV 14 비트, 압축 레벨 6)로 내보낸 것을
 * 그대로 올림. UV 를 기본값(12 비트)으로 두면 4096 px 텍스처에서 한 칸 단위라 구운 무늬가 밀림.
 *
 * 압축 없이 내보낸 GLB(통짜 굽기 기준 약 10 MB)를 받았을 때는 같은 설정으로 이렇게 줄일 수 있음:
 *
 * ```bash
 * pnpm dlx @gltf-transform/cli@4 webp <원본.glb> tmp.glb --slots "emissiveTexture" --quality 90
 * pnpm dlx @gltf-transform/cli@4 draco tmp.glb public/models/bitcoin_hall_draco.glb \\
 *   --quantize-position 14 --quantize-normal 10 --quantize-texcoord 14 --quantize-color 10
 * ```
 */

/** 빌드 때 맵 파일 해시를 붙임(`next.config.ts`). 맵이 바뀌면 주소가 바뀌어 캐시를 건너뜀. */
export const HALL_MODEL_URL = toVersionedModelUrl("/models/bitcoin_hall_draco.glb");

/**
 * Draco 디코더 경로.
 *
 * `node_modules/three/examples/jsm/libs/draco/gltf` 를 `public/draco` 로 복사해
 * 둔다. 외부 호스트가 끼면 CSP·오프라인·차단 환경에서 맵이 통째로 실패한다.
 */
export const DRACO_DECODER_PATH = "/draco/";

/**
 * 라이트맵 최대 밝기. 굽는 쪽 `bake_info.json` 의 `lightmap_max` 와 같아야 함.
 *
 * `MeshBasicMaterial` 은 라이트맵에 1/π 를 곱하므로 π 를 곱해 되돌림.
 */
const HALL_LIGHTMAP_MAX = 3.0;

/**
 * 로더를 **three 번들에서 직접** 가져온다.
 *
 * drei 의 `useGLTF` 는 `three-stdlib` 의 로더를 쓰는데, 그쪽이 기대하는 Draco
 * 디코더 세대가 `public/draco` 와 달라 워커 안에서 promise 가 영영 안 풀림.
 * 로더와 디코더를 같은 번들로 묶어 어긋날 자리를 없앴음.
 */
const extendWithDracoDecoder = (loader: GLTFLoader): void => {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(dracoLoader);
};

/** GLB 안의 노드 이름. 굽는 스크립트와 **같은 문자열**이어야 한다. */
export const HALL_NODE_NAMES = {
  collision: "Collision",
  lampPrefix: "Lamp_",
} as const;

export type LanternAnchor = readonly [number, number, number];

export interface HallModel {
  /** 씬 그래프 전체. `<primitive>` 로 그대로 붙인다. 높이는 붙일 때 올림. */
  scene: Group;
  /** 충돌 전용 지오메트리. `mapOffsetY` 만큼 올린 사본임. */
  collisionGeometry: BufferGeometry;
  /** 램프 자리(월드 좌표). 아바타용 포인트라이트를 가까운 곳에만 켬. */
  lanternAnchors: readonly LanternAnchor[];
}

// region [Privates]
const isMesh = (object: Object3D): object is Mesh => {
  return (object as Mesh).isMesh === true;
};

/**
 * 구운 조명을 쓰는 머티리얼로 바꾼다.
 *
 * 굽는 방식이 둘이라 둘 다 읽음. 어느 쪽이든 조명 계산이 없는 언릿 머티리얼로 바꿈.
 * 이미 바꾼 메시(재마운트)와 처음부터 언릿인 메시(안뜰)는 건너뜀.
 *
 * - **통짜 굽기**: 색과 조명을 한 장에 구워 emission 슬롯에 실어 옴(`emissiveMap`,
 *   occlusion 슬롯 없음). 밝기 배율은 맵이 `emissiveStrength` 로 들고 와서 그대로 곱함.
 * - **라이트맵**: 반복 무늬 텍스처와 따로, 라이트맵이 occlusion 슬롯(TEXCOORD_1)에 실려 와
 *   로더가 `aoMap` 으로 읽음. 그걸 `lightMap` 으로 옮김. 색 텍스처는 base color 나
 *   emission 슬롯 중 실려 온 쪽을 씀.
 *
 * 램프 불빛은 톤 매핑을 꺼서 늘 밝게 둠. 색은 구운 텍스처나 버텍스 컬러 중 있는 쪽을 씀.
 */
const applyBakedLighting = (mesh: Mesh): void => {
  const source = mesh.material as MeshStandardMaterial;

  if (!source.isMeshStandardMaterial) {
    return;
  }

  const hasVertexColors = mesh.geometry.hasAttribute("color");

  if (mesh.userData.lamp_glow === true) {
    mesh.material = new MeshBasicMaterial({
      map: source.emissiveMap,
      vertexColors: hasVertexColors,
      side: source.side,
      toneMapped: false,
    });
    source.dispose();

    return;
  }

  const lightMap = source.aoMap;

  if (lightMap) {
    lightMap.colorSpace = SRGBColorSpace;
    mesh.material = new MeshBasicMaterial({
      map: source.map ?? source.emissiveMap,
      vertexColors: hasVertexColors,
      lightMap,
      lightMapIntensity: HALL_LIGHTMAP_MAX * Math.PI,
    });
    source.dispose();

    return;
  }

  if (source.emissiveMap) {
    mesh.material = new MeshBasicMaterial({
      map: source.emissiveMap,
      color: source.emissive.clone().multiplyScalar(source.emissiveIntensity),
      vertexColors: hasVertexColors,
      side: source.side,
    });
    source.dispose();
  }
};
// endregion

/**
 * GLB 를 읽어 씬·충돌·램프로 나눈다.
 *
 * 캐시된 씬 그래프를 제자리에서 고친다. 맵은 화면에 하나뿐이고 고치는 내용이
 * 멱등(숨기기·머티리얼 교체)이라 사본을 만들지 않았음.
 */
export const useHallModel = (): HallModel => {
  const { scene } = useLoader(GLTFLoader, HALL_MODEL_URL, extendWithDracoDecoder);

  return useMemo((): HallModel => {
    let collisionGeometry: BufferGeometry | null = null;
    const lanternAnchors: LanternAnchor[] = [];

    scene.traverse((object) => {
      if (object.userData.lamp === true && object.name.startsWith(HALL_NODE_NAMES.lampPrefix)) {
        lanternAnchors.push([
          object.position.x,
          object.position.y + SPACE_HALL.mapOffsetY,
          object.position.z,
        ]);
        return;
      }

      if (!isMesh(object)) {
        return;
      }

      if (object.name === HALL_NODE_NAMES.collision) {
        // 원본은 캐시가 들고 있어 재마운트마다 또 올라가지 않게 사본을 올림.
        collisionGeometry = object.geometry.clone().translate(0, SPACE_HALL.mapOffsetY, 0);
        object.visible = false;
        return;
      }

      applyBakedLighting(object);
    });

    if (!collisionGeometry) {
      throw new Error(
        `맵 GLB 에 '${HALL_NODE_NAMES.collision}' 메시가 없습니다. 굽는 스크립트가 바뀌었는지 확인하세요.`,
      );
    }

    return { scene, collisionGeometry, lanternAnchors };
  }, [scene]);
};

useLoader.preload(GLTFLoader, HALL_MODEL_URL, extendWithDracoDecoder);
