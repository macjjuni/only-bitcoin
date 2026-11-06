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
import {
  SPACE_AVATAR,
  SPACE_AVATAR_MODELS,
  SPACE_DEFAULT_AVATAR_MODEL_INDEX,
  type SpaceAvatarModel,
} from "@/entities/space";
import { toVersionedModelUrl } from "./modelAssetUrl";

/**
 * 아바타 모델 로더.
 *
 * 원본은 `assets/avatars/voxel-*.blend` 이고 `scripts/blender/process-voxel-character.py`
 * 가 인스턴싱 가능한 형태로 가공함. 원본은 메시가 부위마다 쪼개져 있고 스킨이 붙어
 * 있어 그대로 쓰면 아바타 한 명이 드로우 콜 수십 개를 씀.
 *
 * 모델 목록과 에셋 경로는 `entities/space` 의 `SPACE_AVATAR_MODELS` 가 가짐. 여기서는
 * 그중 하나를 받아 three 객체로 바꾸는 일만 함.
 */
export const CREW_MODEL = {
  /** 기본 키(m). 발바닥이 원점이라 `(x, 0, z)` 에 그대로 둠. 모델별 키는 레지스트리 `height`. */
  height: 1.81,
  /** 정점마다 따라갈 본 번호. glTF 의 `_BONEINDEX` 를 three 가 소문자로 바꿈. */
  boneIndexAttribute: "_boneindex",
} as const;

/**
 * Walk 베이크 규격.
 *
 * 가공 스크립트와 **같은 값**이어야 함. 어긋나면 셰이더가 엉뚱한 텍셀을 읽어 아바타가
 * 터짐. `crewModel.test.ts` 가 `.bin` 크기로 검증함.
 */
export const CREW_WALK = {
  /**
   * 본 칸 수. **모든 모델이 같아야 함**. 셰이더의 텍셀 조회 폭을 정함.
   *
   * 프레임 수는 여기 안 둠. 모델마다 달라(크루·곰 40, 황소 48) 레지스트리의
   * `walkFrameCount` 가 들고 있고, 셰이더는 텍스처 높이에서 읽음.
   */
  boneCount: 22,
  /** 행렬 한 개는 4x4 의 위 3행만 저장함. 마지막 행은 늘 (0,0,0,1). */
  rowsPerBone: 3,
  /**
   * 한 사이클이 덮는 이동 거리(m).
   *
   * 걸은 거리에 비례해 사이클을 돌려 발이 안 미끄러지게 함. 실제 보폭(약 0.52 m x 2
   * 걸음)보다 길게 잡았음. 보폭 그대로 쓰면 4.5 m/s 에서 초당 4.3 사이클이 되어
   * 다리가 과하게 빨라짐. 그리기 배율만큼 보폭이 길어져 같이 곱함.
   */
  metersPerCycle: 1.9 * SPACE_AVATAR.scale,
  /** 멈출 때 레스트 포즈로 돌아가는 시간(초). */
  blendSeconds: 0.12,
} as const;

/**
 * 발차기 베이크 규격. 가공 스크립트의 `KICK_FRAMES` 와 같아야 함.
 *
 * 모든 모델이 같은 프레임 수라 레지스트리에 안 둠. 첫·끝 프레임은 레스트 포즈임.
 */
export const CREW_KICK = {
  frameCount: 16,
  /** 시작·끝에 걷기와 섞는 구간(재생 비율). 걷다 차도 다리가 순간이동하지 않게 함. */
  blendInRatio: 0.15,
} as const;

export interface CrewModelParts {
  bodyGeometry: BufferGeometry;
  accentGeometry: BufferGeometry;
  /** 눈 글린트가 없는 모델(곰)에서는 `null`. */
  pupilGlintGeometry: BufferGeometry | null;
  /**
   * 아틀라스가 붙은 **원본** 머티리얼. 픽셀 아트라 확대 필터를 유지해야 함.
   * 걷기 셰이더는 `useSkinnedCrewMaterial` 이 사본에 심음.
   */
  bodyMaterial: Material;
  pupilGlintMaterial: Material | null;
  /** Walk 본 행렬 텍스처. 셰이더가 본 번호와 프레임으로 조회함. */
  walkTexture: Texture;
  /** 발차기 본 행렬 텍스처. 걷기 결과 위에 섞음. */
  kickTexture: Texture;
}

// region [Privates]
const findMesh = (root: Object3D, name: string, modelUrl: string): Mesh => {
  const found = root.getObjectByName(name);

  if (!found || !("geometry" in found)) {
    /*
     * 실제로 들어 있는 이름을 같이 알려 줌.
     *
     * 이름이 엉뚱하면 **베이크가 잘못된 것**이고, 목록이 비었거나 다른 모델 이름이
     * 보이면 **`useGLTF` 캐시에 옛 응답이 남은 것**임. drei 는 URL 별로 파싱 결과를
     * 영구 캐시해서 모델을 다시 구운 뒤에는 새로고침해야 함.
     */
    const actualNames = root.children.map((child) => child.name).join(", ") || "(없음)";

    throw new Error(
      `아바타 모델에 '${name}' 메시가 없습니다. ${modelUrl} 에 들어 있는 것: ${actualNames}. ` +
        "모델을 다시 구웠다면 새로고침하세요.",
    );
  }
  const mesh = found as Mesh;

  // 본 번호가 없으면 셰이더가 0번 본만 읽어 걷기가 **조용히** 죽음.
  if (!mesh.geometry.getAttribute(CREW_MODEL.boneIndexAttribute)) {
    throw new Error(
      `'${name}' 에 '${CREW_MODEL.boneIndexAttribute}' 속성이 없습니다. ` +
        "scripts/blender/process-voxel-character.py 로 모델을 다시 가공하세요.",
    );
  }

  return mesh;
};

/**
 * 구운 행렬을 그대로 담는 데이터 텍스처.
 *
 * 본 하나가 텍셀 3개(행렬의 위 3행)를 쓰고 가로 한 줄이 한 프레임임. 정점 위치를
 * 통째로 굽는 VAT 보다 훨씬 작음(걷기 41 KB, 발차기 16 KB).
 */
const createBoneTexture = (buffer: ArrayBuffer, frameCount: number, url: string): Texture => {
  const width = CREW_WALK.boneCount * CREW_WALK.rowsPerBone;
  const expected = width * frameCount * 4;
  const data = new Float32Array(buffer);

  if (data.length !== expected) {
    throw new Error(`${url} 크기가 규격과 다릅니다. float ${data.length}개, 기대 ${expected}개.`);
  }

  const texture = new DataTexture(data, width, frameCount, RGBAFormat, FloatType);
  // 프레임 보간은 셰이더가 직접 함. 텍셀을 섞으면 이웃 본의 행렬이 번짐.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
};

// endregion

/**
 * 모델에서 지오메트리와 몸통 머티리얼, 걷기·발차기 행렬 텍스처를 꺼냄.
 *
 * 머티리얼을 직접 안 만들고 glTF 가 만든 것을 그대로 씀. 아틀라스 샘플러의 `NEAREST`
 * 확대 필터가 같이 따라와야 픽셀 아트가 안 뭉개짐.
 */
export const useCrewModel = (model: SpaceAvatarModel): CrewModelParts => {
  // 다시 구운 모델이 30일 캐시에 막히지 않게 내용 해시를 붙여 받음.
  const { scene } = useGLTF(toVersionedModelUrl(model.modelUrl));
  const [walkBuffer, kickBuffer] = useLoader(
    FileLoader,
    [toVersionedModelUrl(model.walkUrl), toVersionedModelUrl(model.kickUrl)],
    (loader) => {
      loader.setResponseType("arraybuffer");
    },
  ) as unknown as [ArrayBuffer, ArrayBuffer];
  const walkTexture = useMemo(
    () => createBoneTexture(walkBuffer, model.walkFrameCount, model.walkUrl),
    [walkBuffer, model],
  );
  const kickTexture = useMemo(
    () => createBoneTexture(kickBuffer, CREW_KICK.frameCount, model.kickUrl),
    [kickBuffer, model],
  );
  const body = findMesh(scene, model.bodyMeshName, model.modelUrl);
  const pupilGlint = model.pupilGlintMeshName
    ? findMesh(scene, model.pupilGlintMeshName, model.modelUrl)
    : null;

  return {
    bodyGeometry: body.geometry,
    accentGeometry: findMesh(scene, model.accentMeshName, model.modelUrl).geometry,
    pupilGlintGeometry: pupilGlint?.geometry ?? null,
    bodyMaterial: body.material as Material,
    pupilGlintMaterial: (pupilGlint?.material as Material | undefined) ?? null,
    walkTexture,
    kickTexture,
  };
};

// 기본 모델만 미리 받음. 나머지는 쓰는 아바타가 생길 때 받음.
useGLTF.preload(
  toVersionedModelUrl(SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX].modelUrl),
);
