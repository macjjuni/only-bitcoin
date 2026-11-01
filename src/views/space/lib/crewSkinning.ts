import { useMemo } from "react";
import type { BufferGeometry, DataTexture, Material, Texture } from "three";
import { DynamicDrawUsage, InstancedBufferAttribute, Vector2 } from "three";
import { CREW_MODEL, CREW_WALK } from "./crewModel";

/** 인스턴스별 애니메이션 위상(0~1). 아바타마다 다른 지점에서 사이클을 돈다. */
export const WALK_PHASE_ATTRIBUTE = "aWalkPhase";
/** 레스트 포즈와 걷기 포즈 사이 섞는 비율(0~1). */
export const WALK_BLEND_ATTRIBUTE = "aWalkBlend";

/**
 * 본 행렬 텍스처를 읽어 정점을 변형하는 셰이더 조각.
 *
 * `InstancedMesh` 는 스키닝을 못 한다. 그래서 three 의 스킨 경로를 쓰지 않고,
 * 구워 둔 본 행렬을 텍스처에서 직접 읽어 정점을 옮긴다. 이 모델은 정점 하나가
 * 본 하나에 100% 묶여 있어(리지드 바인딩) 행렬 한 번만 곱하면 된다.
 */
const VERTEX_DECLARATIONS = /* glsl */ `
  attribute float ${CREW_MODEL.boneIndexAttribute};
  attribute float ${WALK_PHASE_ATTRIBUTE};
  attribute float ${WALK_BLEND_ATTRIBUTE};
  uniform sampler2D uWalkTexture;
  uniform vec2 uWalkTextureSize;

  mat4 readBoneMatrix(float boneIndex, float frame) {
    float column = boneIndex * ${CREW_WALK.rowsPerBone}.0;
    float v = (frame + 0.5) / uWalkTextureSize.y;
    vec4 row0 = texture2D(uWalkTexture, vec2((column + 0.5) / uWalkTextureSize.x, v));
    vec4 row1 = texture2D(uWalkTexture, vec2((column + 1.5) / uWalkTextureSize.x, v));
    vec4 row2 = texture2D(uWalkTexture, vec2((column + 2.5) / uWalkTextureSize.x, v));

    // GLSL 의 mat4 생성자는 열 우선이다. 구운 값은 행이라 전치해 넣는다.
    return mat4(
      row0.x, row1.x, row2.x, 0.0,
      row0.y, row1.y, row2.y, 0.0,
      row0.z, row1.z, row2.z, 0.0,
      row0.w, row1.w, row2.w, 1.0
    );
  }
`;

/**
 * 두 프레임을 섞어 읽는다.
 *
 * 24 fps 로 구워 그냥 끊어 쓰면 다리가 덜컥거린다. 위치를 선형 보간해야 부드럽다.
 *
 * 프레임 수를 셰이더에 **상수로 박지 않고** 텍스처 높이(`uWalkTextureSize.y`)에서
 * 읽는다. 모델마다 Walk 길이가 달라(크루·곰 40, 황소 48) 상수로 박으면 모델마다
 * 셰이더 프로그램이 따로 컴파일된다.
 */
const WALK_POSE = /* glsl */ `
  float walkFrameCount = uWalkTextureSize.y;
  float walkFrame = ${WALK_PHASE_ATTRIBUTE} * walkFrameCount;
  float walkFrameFloor = floor(walkFrame);
  float walkLerp = walkFrame - walkFrameFloor;
  mat4 walkBoneA = readBoneMatrix(
    ${CREW_MODEL.boneIndexAttribute}, mod(walkFrameFloor, walkFrameCount));
  mat4 walkBoneB = readBoneMatrix(
    ${CREW_MODEL.boneIndexAttribute}, mod(walkFrameFloor + 1.0, walkFrameCount));
`;

/**
 * 머티리얼에 인스턴스 스키닝을 심는다.
 *
 * 멈춰 있을 때는 레스트 포즈로 섞는다. `Idle` 클립에 움직임이 없어(전 본 0°)
 * 서 있는 자세는 모델 그대로가 정답이다.
 */
export const applyCrewSkinning = (material: Material, walkTexture: Texture): void => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWalkTexture = { value: walkTexture };
    shader.uniforms.uWalkTextureSize = {
      // 세로 크기가 곧 프레임 수다. 셰이더가 이 값으로 사이클을 돈다.
      value: new Vector2(
        (walkTexture as DataTexture).image.width,
        (walkTexture as DataTexture).image.height,
      ),
    };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECLARATIONS}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        #include <beginnormal_vertex>
        ${WALK_POSE}
        vec3 walkNormal = mix(
          mat3(walkBoneA) * objectNormal, mat3(walkBoneB) * objectNormal, walkLerp);
        objectNormal = normalize(mix(objectNormal, walkNormal, ${WALK_BLEND_ATTRIBUTE}));
        `,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        vec3 walkPosition = mix(
          (walkBoneA * vec4(position, 1.0)).xyz,
          (walkBoneB * vec4(position, 1.0)).xyz,
          walkLerp
        );
        transformed = mix(transformed, walkPosition, ${WALK_BLEND_ATTRIBUTE});
        `,
      );
  };
  // 패치는 프로그램을 새로 만들게 한다. 캐시 키를 바꿔야 반영된다.
  material.customProgramCacheKey = () => "crew-skinning";
  material.needsUpdate = true;
};

/**
 * 인스턴스별 위상·블렌드 버퍼를 붙인 지오메트리 사본을 만든다.
 *
 * 원본은 `useGLTF` 캐시가 공유하므로 인스턴스 속성을 직접 달면 안 된다.
 * 로컬 플레이어와 원격 아바타가 서로의 버퍼를 덮어쓴다.
 */
export const createCrewInstanceGeometry = (
  source: BufferGeometry,
  capacity: number,
): {
  geometry: BufferGeometry;
  phase: InstancedBufferAttribute;
  blend: InstancedBufferAttribute;
} => {
  const geometry = source.clone();
  const phase = new InstancedBufferAttribute(new Float32Array(capacity), 1);
  const blend = new InstancedBufferAttribute(new Float32Array(capacity), 1);
  phase.setUsage(DynamicDrawUsage);
  blend.setUsage(DynamicDrawUsage);
  geometry.setAttribute(WALK_PHASE_ATTRIBUTE, phase);
  geometry.setAttribute(WALK_BLEND_ATTRIBUTE, blend);

  return { geometry, phase, blend };
};

/**
 * 걷기 셰이더를 심은 머티리얼 사본.
 *
 * `useGLTF` 캐시의 원본을 직접 고치면 다른 곳에서 쓸 때 섞인다. 사본 하나를
 * 만들어 로컬 플레이어와 원격 아바타가 함께 쓴다. 컴포넌트마다 만들면 같은
 * 셰이더 프로그램을 두 번 컴파일한다.
 */
const skinnedMaterials = new WeakMap<Material, Material>();

/**
 * 글린트가 없는 모델(곰)에서는 `source` 가 `null` 이라 그대로 `null` 을 돌려준다.
 *
 * 오버로드를 두는 이유는 몸통 머티리얼이 **항상 있기** 때문이다. 반환형을
 * `Material | null` 하나로 두면 호출부마다 없을 수도 있는 값처럼 다뤄야 한다.
 */
export function useSkinnedCrewMaterial(source: Material, walkTexture: Texture): Material;
export function useSkinnedCrewMaterial(
  source: Material | null,
  walkTexture: Texture,
): Material | null;
export function useSkinnedCrewMaterial(
  source: Material | null,
  walkTexture: Texture,
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
    applyCrewSkinning(material, walkTexture);
    skinnedMaterials.set(source, material);

    return material;
  }, [source, walkTexture]);
}
