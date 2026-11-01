import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  type BufferGeometry,
  DataTexture,
  FileLoader,
  FloatType,
  type Material,
  type Mesh,
  NearestFilter,
  type Object3D,
  RGBAFormat,
  type Texture,
} from "three";

/**
 * 크루 캐릭터 모델.
 *
 * 원본은 `public/models/voxel-crew.blend` 이고,
 * `scripts/blender/process-voxel-crew.py` 가 인스턴싱 가능한 형태로 가공한다.
 * 원본은 메시가 부위마다 쪼개져 있고 스킨이 붙어 있어, 그대로 쓰면 아바타 한
 * 명이 드로우 콜 수십 개를 쓴다.
 */
export const CREW_MODEL_URL = "/models/crew.glb";

/** Walk 한 사이클의 본 스키닝 행렬. 가공 스크립트가 함께 굽는다. */
export const CREW_WALK_URL = "/models/crew-walk.bin";

export const CREW_MODEL = {
  /** 발바닥이 원점이라 아바타를 `(x, 0, z)` 에 그대로 둔다. */
  height: 1.81,
  /** 고정 배색 메시. 아틀라스 텍스처를 그대로 쓴다. */
  bodyMeshName: "crew_body",
  /**
   * 플레이어 색을 받는 앞치마 앞판.
   *
   * 아틀라스의 앞치마 색이 `#18171a`(밝기 13%)라 텍스처에 색을 곱하면 검게
   * 남는다. 앞판만 텍스처 없는 단색으로 그려야 색이 보인다.
   */
  accentMeshName: "crew_accent",
  pupilGlintMeshName: "crew_pupil_glint",
  /** 정점마다 따라갈 본 번호. glTF 의 `_BONEINDEX` 를 three 가 소문자로 바꾼다. */
  boneIndexAttribute: "_boneindex",
} as const;

/**
 * Walk 베이크 규격.
 *
 * 가공 스크립트와 **같은 값**이어야 한다. 어긋나면 셰이더가 엉뚱한 텍셀을 읽어
 * 아바타가 터진다. `crewModel.test.ts` 가 `.bin` 크기로 검증한다.
 */
export const CREW_WALK = {
  boneCount: 22,
  frameCount: 40,
  /** 행렬 한 개는 4x4 의 위 3행만 저장한다. 마지막 행은 항상 (0,0,0,1) 이다. */
  rowsPerBone: 3,
  /**
   * 한 사이클이 덮는 이동 거리(m).
   *
   * 걸은 거리에 비례해 사이클을 돌려 발이 미끄러지지 않게 한다. 실제 보폭
   * (약 0.52 m x 2 걸음)보다 길게 잡았다. 보폭 그대로 쓰면 이동 속도 4.5 m/s
   * 에서 초당 4.3 사이클이 되어 다리가 과하게 빨라진다.
   */
  metersPerCycle: 1.9,
  /** 멈출 때 레스트 포즈로 돌아가는 시간(초). */
  blendSeconds: 0.12,
} as const;

export interface CrewModelParts {
  bodyGeometry: BufferGeometry;
  accentGeometry: BufferGeometry;
  pupilGlintGeometry: BufferGeometry;
  /**
   * 아틀라스가 붙은 **원본** 머티리얼. 픽셀 아트라 확대 필터를 유지해야 한다.
   * 걷기 셰이더는 `useSkinnedCrewMaterial` 이 사본에 심는다.
   */
  bodyMaterial: Material;
  pupilGlintMaterial: Material;
  /** Walk 본 행렬 텍스처. 셰이더가 본 번호와 프레임으로 조회한다. */
  walkTexture: Texture;
}

// region [Privates]
const findMesh = (root: Object3D, name: string): Mesh => {
  const found = root.getObjectByName(name);

  if (!found || !("geometry" in found)) {
    throw new Error(`크루 모델에 '${name}' 메시가 없습니다. ${CREW_MODEL_URL} 를 확인하세요.`);
  }
  const mesh = found as Mesh;

  // 본 번호가 없으면 셰이더가 0번 본만 읽어 걷기가 **조용히** 죽는다.
  if (!mesh.geometry.getAttribute(CREW_MODEL.boneIndexAttribute)) {
    throw new Error(
      `'${name}' 에 '${CREW_MODEL.boneIndexAttribute}' 속성이 없습니다. ` +
        "scripts/blender/process-voxel-crew.py 로 모델을 다시 가공하세요.",
    );
  }

  return mesh;
};

/**
 * 구운 행렬을 그대로 담는 데이터 텍스처.
 *
 * 본 하나가 텍셀 3개(행렬의 위 3행)를 쓰고, 세로 한 줄이 한 프레임이다.
 * 정점 위치를 통째로 굽는 VAT 보다 자료가 훨씬 작다(41 KB).
 */
const createWalkTexture = (buffer: ArrayBuffer): Texture => {
  const width = CREW_WALK.boneCount * CREW_WALK.rowsPerBone;
  const expected = width * CREW_WALK.frameCount * 4;
  const data = new Float32Array(buffer);

  if (data.length !== expected) {
    throw new Error(
      `${CREW_WALK_URL} 크기가 규격과 다릅니다. float ${data.length}개, 기대 ${expected}개.`,
    );
  }

  const texture = new DataTexture(data, width, CREW_WALK.frameCount, RGBAFormat, FloatType);
  // 프레임 보간은 셰이더가 직접 한다. 텍셀을 섞으면 이웃 본의 행렬이 번진다.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
};
// endregion

/**
 * 모델에서 지오메트리와 몸통 머티리얼, Walk 행렬 텍스처를 꺼낸다.
 *
 * 머티리얼을 직접 만들지 않고 glTF 가 만든 것을 그대로 쓴다. 아틀라스 샘플러의
 * `NEAREST` 확대 필터가 함께 따라와야 픽셀 아트가 뭉개지지 않는다.
 */
export const useCrewModel = (): CrewModelParts => {
  const { scene } = useGLTF(CREW_MODEL_URL);
  const walkBuffer = useLoader(FileLoader, CREW_WALK_URL, (loader) => {
    loader.setResponseType("arraybuffer");
  }) as unknown as ArrayBuffer;
  const walkTexture = useMemo(() => createWalkTexture(walkBuffer), [walkBuffer]);
  const body = findMesh(scene, CREW_MODEL.bodyMeshName);
  const pupilGlint = findMesh(scene, CREW_MODEL.pupilGlintMeshName);

  return {
    bodyGeometry: body.geometry,
    accentGeometry: findMesh(scene, CREW_MODEL.accentMeshName).geometry,
    pupilGlintGeometry: pupilGlint.geometry,
    bodyMaterial: body.material as Material,
    pupilGlintMaterial: pupilGlint.material as Material,
    walkTexture,
  };
};

useGLTF.preload(CREW_MODEL_URL);
