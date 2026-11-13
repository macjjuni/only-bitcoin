import { useMemo } from "react";
import type { BufferGeometry, DataTexture, Material, Texture } from "three";
import { DynamicDrawUsage, InstancedBufferAttribute, Vector2 } from "three";
import { CREW_CLIPS, CREW_MODEL } from "./crewModel";

/** 인스턴스별 포즈 줄. x 는 이전 포즈, y 는 지금 포즈의 줄 번호(소수). */
export const POSE_ROWS_ATTRIBUTE = "aPoseRows";
/** 이전 포즈에서 지금 포즈로 섞는 비율(0…1). */
export const POSE_BLEND_ATTRIBUTE = "aPoseBlend";

/**
 * 본 행렬 텍스처를 읽어 정점을 변형하는 셰이더 조각.
 *
 * `InstancedMesh` 는 스키닝을 못 함. 그래서 three 의 스킨 경로 대신 구워 둔 본 행렬을
 * 텍스처에서 직접 읽어 정점을 옮김. 정점 하나가 본 하나에 100% 묶여 있어(리지드
 * 바인딩) 행렬 한 번만 곱하면 됨.
 *
 * 텍스처 한 장에 모든 모션이 세로로 쌓여 있음. 셰이더는 모션이 뭔지 모르고 **줄 번호**만
 * 받음. 어느 모션의 몇 번째 프레임인지는 CPU(`avatarAnimation.ts`)가 줄 번호로 바꿔 줌.
 */
const VERTEX_DECLARATIONS = /* glsl */ `
  attribute float ${CREW_MODEL.boneIndexAttribute};
  attribute vec2 ${POSE_ROWS_ATTRIBUTE};
  attribute float ${POSE_BLEND_ATTRIBUTE};
  uniform sampler2D uClipTexture;
  uniform vec2 uClipTextureSize;

  mat4 readBoneMatrix(float boneIndex, float frame) {
    float column = boneIndex * ${CREW_CLIPS.rowsPerBone}.0;
    float v = (frame + 0.5) / uClipTextureSize.y;
    vec4 row0 = texture2D(uClipTexture, vec2((column + 0.5) / uClipTextureSize.x, v));
    vec4 row1 = texture2D(uClipTexture, vec2((column + 1.5) / uClipTextureSize.x, v));
    vec4 row2 = texture2D(uClipTexture, vec2((column + 2.5) / uClipTextureSize.x, v));

    // GLSL 의 mat4 생성자는 열 우선임. 구운 값은 행이라 전치해 넣음.
    return mat4(
      row0.x, row1.x, row2.x, 0.0,
      row0.y, row1.y, row2.y, 0.0,
      row0.z, row1.z, row2.z, 0.0,
      row0.w, row1.w, row2.w, 1.0
    );
  }
`;

/**
 * 포즈 둘을 읽음. 포즈마다 이웃한 두 줄을 섞음.
 *
 * 그냥 끊어 쓰면 다리가 덜컥거림. 줄 번호의 소수부로 다음 줄과 선형 보간해야 부드러움.
 * 반복 모션도 끝 프레임까지 구워져 있어 "다음 줄" 이 늘 같은 모션 안에 있음. 그래서
 * 끝에서 처음으로 돌아가는 계산이 필요 없음. 맨 마지막 줄만 텍스처 끝이라 잘라 줌.
 */
const POSE = /* glsl */ `
  float lastRow = uClipTextureSize.y - 1.0;
  float rowA = clamp(${POSE_ROWS_ATTRIBUTE}.x, 0.0, lastRow);
  float rowB = clamp(${POSE_ROWS_ATTRIBUTE}.y, 0.0, lastRow);
  float rowAFloor = floor(rowA);
  float rowBFloor = floor(rowB);
  float lerpA = rowA - rowAFloor;
  float lerpB = rowB - rowBFloor;
  mat4 boneA0 = readBoneMatrix(${CREW_MODEL.boneIndexAttribute}, rowAFloor);
  mat4 boneA1 = readBoneMatrix(${CREW_MODEL.boneIndexAttribute}, min(rowAFloor + 1.0, lastRow));
  mat4 boneB0 = readBoneMatrix(${CREW_MODEL.boneIndexAttribute}, rowBFloor);
  mat4 boneB1 = readBoneMatrix(${CREW_MODEL.boneIndexAttribute}, min(rowBFloor + 1.0, lastRow));
`;

const resolveTextureSize = (texture: Texture): Vector2 => {
  const { image } = texture as DataTexture;

  // 세로 크기가 곧 전체 프레임 수임. 셰이더가 이 값으로 줄을 고름.
  return new Vector2(image.width, image.height);
};

/**
 * 머티리얼에 인스턴스 스키닝을 심음.
 *
 * 이전 포즈와 지금 포즈를 `aPoseBlend` 로 섞음. 정점마다 행렬 넷(포즈 둘 × 이웃 줄 둘)을
 * 읽는데, 걷기·공격 두 텍스처를 따로 읽던 때와 같은 횟수임.
 */
export const applyCrewSkinning = (material: Material, clipTexture: Texture): void => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uClipTexture = { value: clipTexture };
    shader.uniforms.uClipTextureSize = { value: resolveTextureSize(clipTexture) };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECLARATIONS}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        #include <beginnormal_vertex>
        ${POSE}
        vec3 normalA = mix(mat3(boneA0) * objectNormal, mat3(boneA1) * objectNormal, lerpA);
        vec3 normalB = mix(mat3(boneB0) * objectNormal, mat3(boneB1) * objectNormal, lerpB);
        objectNormal = normalize(mix(normalA, normalB, ${POSE_BLEND_ATTRIBUTE}));
        `,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        vec4 skinSource = vec4(position, 1.0);
        vec3 positionA = mix((boneA0 * skinSource).xyz, (boneA1 * skinSource).xyz, lerpA);
        vec3 positionB = mix((boneB0 * skinSource).xyz, (boneB1 * skinSource).xyz, lerpB);
        transformed = mix(positionA, positionB, ${POSE_BLEND_ATTRIBUTE});
        `,
      );
  };
  // 패치는 프로그램을 새로 만들게 함. 캐시 키를 바꿔야 반영됨.
  material.customProgramCacheKey = () => "crew-skinning-clips";
  material.needsUpdate = true;
};

export interface CrewInstanceGeometry {
  geometry: BufferGeometry;
  /** 인스턴스마다 (이전 포즈 줄, 지금 포즈 줄). */
  poseRows: InstancedBufferAttribute;
  poseBlend: InstancedBufferAttribute;
}

/**
 * 인스턴스별 포즈 버퍼를 붙인 지오메트리 사본을 만듦.
 *
 * 원본은 `useGLTF` 캐시가 공유해서 인스턴스 속성을 직접 달면 안 됨. 로컬 플레이어와
 * 원격 아바타가 서로의 버퍼를 덮어씀.
 */
export const createCrewInstanceGeometry = (
  source: BufferGeometry,
  capacity: number,
): CrewInstanceGeometry => {
  const geometry = source.clone();
  const createAttribute = (name: string, itemSize: number): InstancedBufferAttribute => {
    const attribute = new InstancedBufferAttribute(new Float32Array(capacity * itemSize), itemSize);
    attribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
    return attribute;
  };
  const poseBlend = createAttribute(POSE_BLEND_ATTRIBUTE, 1);

  // 0 으로 두면 첫 프레임에 이전 포즈(0번 줄)만 보임. 지금 포즈가 보이게 채워 둠.
  poseBlend.array.fill(1);

  return {
    geometry,
    poseRows: createAttribute(POSE_ROWS_ATTRIBUTE, 2),
    poseBlend,
  };
};

/** 한 인스턴스의 포즈를 버퍼에 씀. */
export const writeCrewPose = (
  buffers: CrewInstanceGeometry,
  instanceIndex: number,
  pose: { rowA: number; rowB: number; blend: number },
): void => {
  buffers.poseRows.setXY(instanceIndex, pose.rowA, pose.rowB);
  buffers.poseBlend.setX(instanceIndex, pose.blend);
};

/**
 * `source` 의 포즈 버퍼를 다른 부위들에 그대로 복사하고 GPU 에 올리라고 표시함.
 *
 * 몸통·색 띠·눈은 같은 포즈여야 따로 안 놂. 부위마다 계산하면 한 프레임 어긋날 수 있음.
 */
export const syncCrewPose = (
  source: CrewInstanceGeometry,
  parts: readonly (CrewInstanceGeometry | null)[],
): void => {
  source.poseRows.needsUpdate = true;
  source.poseBlend.needsUpdate = true;

  for (const part of parts) {
    if (!part) {
      continue;
    }
    part.poseRows.array.set(source.poseRows.array);
    part.poseBlend.array.set(source.poseBlend.array);
    part.poseRows.needsUpdate = true;
    part.poseBlend.needsUpdate = true;
  }
};

/**
 * 스키닝 셰이더를 심은 머티리얼 사본.
 *
 * `useGLTF` 캐시의 원본을 직접 고치면 다른 데서 쓸 때 섞임. 사본 하나를 만들어 로컬
 * 플레이어와 원격 아바타가 같이 씀. 컴포넌트마다 만들면 같은 프로그램을 두 번
 * 컴파일함.
 */
const skinnedMaterials = new WeakMap<Material, Material>();

/**
 * 눈 메시가 없는 모델에서는 `source` 가 `null` 이라 그대로 `null` 을 돌려줌.
 *
 * 오버로드를 두는 이유는 몸통 머티리얼이 **늘 있어서**임. 반환형을 `Material | null`
 * 하나로 두면 호출부마다 없을 수도 있는 값처럼 다뤄야 함.
 */
export function useSkinnedCrewMaterial(source: Material, clipTexture: Texture): Material;
export function useSkinnedCrewMaterial(
  source: Material | null,
  clipTexture: Texture,
): Material | null;
export function useSkinnedCrewMaterial(
  source: Material | null,
  clipTexture: Texture,
): Material | null {
  return useMemo(() => {
    if (!source) {
      return null;
    }
    const cached = skinnedMaterials.get(source);

    if (cached) {
      return cached;
    }
    const material = source.clone();
    applyCrewSkinning(material, clipTexture);
    skinnedMaterials.set(source, material);

    return material;
  }, [source, clipTexture]);
}
