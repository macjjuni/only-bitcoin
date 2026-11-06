import { useMemo } from "react";
import type { BufferGeometry, DataTexture, Material, Texture } from "three";
import { DynamicDrawUsage, InstancedBufferAttribute, Vector2 } from "three";
import { CREW_MODEL, CREW_WALK } from "./crewModel";

/** 인스턴스별 걷기 위상(0~1). 아바타마다 다른 지점에서 사이클을 돎. */
export const WALK_PHASE_ATTRIBUTE = "aWalkPhase";
/** 레스트 포즈와 걷기 포즈 사이 섞는 비율(0~1). */
export const WALK_BLEND_ATTRIBUTE = "aWalkBlend";
/** 발차기 진행도(0~1). */
export const KICK_PHASE_ATTRIBUTE = "aKickPhase";
/** 걷기 결과와 발차기 포즈 사이 섞는 비율(0~1). 안 찰 때는 0. */
export const KICK_BLEND_ATTRIBUTE = "aKickBlend";

/**
 * 본 행렬 텍스처를 읽어 정점을 변형하는 셰이더 조각.
 *
 * `InstancedMesh` 는 스키닝을 못 함. 그래서 three 의 스킨 경로 대신 구워 둔 본 행렬을
 * 텍스처에서 직접 읽어 정점을 옮김. 정점 하나가 본 하나에 100% 묶여 있어(리지드
 * 바인딩) 행렬 한 번만 곱하면 됨.
 *
 * 걷기·발차기 텍스처는 폭이 같고(본 22칸) 높이(프레임 수)만 다름. 그래서 읽는 함수
 * 하나에 텍스처와 높이를 넘김.
 */
const VERTEX_DECLARATIONS = /* glsl */ `
  attribute float ${CREW_MODEL.boneIndexAttribute};
  attribute float ${WALK_PHASE_ATTRIBUTE};
  attribute float ${WALK_BLEND_ATTRIBUTE};
  attribute float ${KICK_PHASE_ATTRIBUTE};
  attribute float ${KICK_BLEND_ATTRIBUTE};
  uniform sampler2D uWalkTexture;
  uniform vec2 uWalkTextureSize;
  uniform sampler2D uKickTexture;
  uniform vec2 uKickTextureSize;
  #ifdef CREW_WEAPON
  attribute vec3 aWeaponOffset;
  #endif

  mat4 readBoneMatrix(sampler2D boneTexture, vec2 textureSize, float boneIndex, float frame) {
    float column = boneIndex * ${CREW_WALK.rowsPerBone}.0;
    float v = (frame + 0.5) / textureSize.y;
    vec4 row0 = texture2D(boneTexture, vec2((column + 0.5) / textureSize.x, v));
    vec4 row1 = texture2D(boneTexture, vec2((column + 1.5) / textureSize.x, v));
    vec4 row2 = texture2D(boneTexture, vec2((column + 2.5) / textureSize.x, v));

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
 * 두 프레임을 섞어 읽음.
 *
 * 그냥 끊어 쓰면 다리가 덜컥거림. 위치를 선형 보간해야 부드러움.
 *
 * 걷기는 순환이라 끝 다음이 처음임. 발차기는 한 번만 돌아서 마지막 프레임에서 멈춤.
 * 프레임 수를 셰이더에 **상수로 안 박고** 텍스처 높이에서 읽음. 모델마다 Walk 길이가
 * 달라(크루·곰 40, 황소 48) 상수로 박으면 모델마다 프로그램이 따로 컴파일됨.
 */
const POSE = /* glsl */ `
  float walkFrameCount = uWalkTextureSize.y;
  float walkFrame = ${WALK_PHASE_ATTRIBUTE} * walkFrameCount;
  float walkFrameFloor = floor(walkFrame);
  float walkLerp = walkFrame - walkFrameFloor;
  mat4 walkBoneA = readBoneMatrix(uWalkTexture, uWalkTextureSize,
    ${CREW_MODEL.boneIndexAttribute}, mod(walkFrameFloor, walkFrameCount));
  mat4 walkBoneB = readBoneMatrix(uWalkTexture, uWalkTextureSize,
    ${CREW_MODEL.boneIndexAttribute}, mod(walkFrameFloor + 1.0, walkFrameCount));

  float kickLastFrame = uKickTextureSize.y - 1.0;
  float kickFrame = clamp(${KICK_PHASE_ATTRIBUTE}, 0.0, 1.0) * kickLastFrame;
  float kickFrameFloor = floor(kickFrame);
  float kickLerp = kickFrame - kickFrameFloor;
  mat4 kickBoneA = readBoneMatrix(uKickTexture, uKickTextureSize,
    ${CREW_MODEL.boneIndexAttribute}, kickFrameFloor);
  mat4 kickBoneB = readBoneMatrix(uKickTexture, uKickTextureSize,
    ${CREW_MODEL.boneIndexAttribute}, min(kickFrameFloor + 1.0, kickLastFrame));
`;

const resolveTextureSize = (texture: Texture): Vector2 => {
  const { image } = texture as DataTexture;

  // 세로 크기가 곧 프레임 수임. 셰이더가 이 값으로 프레임을 고름.
  return new Vector2(image.width, image.height);
};

/**
 * 머티리얼에 인스턴스 스키닝을 심음.
 *
 * 멈춰 있을 때는 레스트 포즈로 섞음. `Idle` 클립에 움직임이 없어(전 본 0°) 서 있는
 * 자세는 모델 그대로가 정답임. 공격(kick 텍스처, 지금은 무기 내려치기)은 그 결과 위에 한
 * 번 더 섞음.
 *
 * `isWeapon` 면 정점을 손 위치 쪽으로 `aWeaponOffset × (1 - 공격 비율)` 만큼 접은 뒤 같은
 * 행렬을 곱함. 공격하지 않을 때는 손 한 점으로 모여 안 보이고, 휘두를 때만 펼쳐짐.
 */
export const applyCrewSkinning = (
  material: Material,
  walkTexture: Texture,
  kickTexture: Texture,
  isWeapon = false,
): void => {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWalkTexture = { value: walkTexture };
    shader.uniforms.uWalkTextureSize = { value: resolveTextureSize(walkTexture) };
    shader.uniforms.uKickTexture = { value: kickTexture };
    shader.uniforms.uKickTextureSize = { value: resolveTextureSize(kickTexture) };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_DECLARATIONS}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        #include <beginnormal_vertex>
        ${POSE}
        vec3 walkNormal = mix(
          mat3(walkBoneA) * objectNormal, mat3(walkBoneB) * objectNormal, walkLerp);
        vec3 kickNormal = mix(
          mat3(kickBoneA) * objectNormal, mat3(kickBoneB) * objectNormal, kickLerp);
        objectNormal = normalize(mix(
          mix(objectNormal, walkNormal, ${WALK_BLEND_ATTRIBUTE}),
          kickNormal,
          ${KICK_BLEND_ATTRIBUTE}
        ));
        `,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
        #include <begin_vertex>
        vec3 skinSource = position;
        #ifdef CREW_WEAPON
        skinSource -= aWeaponOffset * (1.0 - ${KICK_BLEND_ATTRIBUTE});
        transformed = skinSource;
        #endif
        vec3 walkPosition = mix(
          (walkBoneA * vec4(skinSource, 1.0)).xyz,
          (walkBoneB * vec4(skinSource, 1.0)).xyz,
          walkLerp
        );
        vec3 kickPosition = mix(
          (kickBoneA * vec4(skinSource, 1.0)).xyz,
          (kickBoneB * vec4(skinSource, 1.0)).xyz,
          kickLerp
        );
        transformed = mix(
          mix(transformed, walkPosition, ${WALK_BLEND_ATTRIBUTE}),
          kickPosition,
          ${KICK_BLEND_ATTRIBUTE}
        );
        `,
      );
  };
  if (isWeapon) {
    material.defines = { ...material.defines, CREW_WEAPON: "" };
  }
  // 패치는 프로그램을 새로 만들게 함. 캐시 키를 바꿔야 반영됨.
  material.customProgramCacheKey = () =>
    isWeapon ? "crew-skinning-kick-weapon" : "crew-skinning-kick";
  material.needsUpdate = true;
};

export interface CrewInstanceGeometry {
  geometry: BufferGeometry;
  phase: InstancedBufferAttribute;
  blend: InstancedBufferAttribute;
  kickPhase: InstancedBufferAttribute;
  kickBlend: InstancedBufferAttribute;
}

/**
 * 인스턴스별 걷기·발차기 버퍼를 붙인 지오메트리 사본을 만듦.
 *
 * 원본은 `useGLTF` 캐시가 공유해서 인스턴스 속성을 직접 달면 안 됨. 로컬 플레이어와
 * 원격 아바타가 서로의 버퍼를 덮어씀.
 */
export const createCrewInstanceGeometry = (
  source: BufferGeometry,
  capacity: number,
): CrewInstanceGeometry => {
  const geometry = source.clone();
  const createAttribute = (name: string): InstancedBufferAttribute => {
    const attribute = new InstancedBufferAttribute(new Float32Array(capacity), 1);
    attribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
    return attribute;
  };

  return {
    geometry,
    phase: createAttribute(WALK_PHASE_ATTRIBUTE),
    blend: createAttribute(WALK_BLEND_ATTRIBUTE),
    kickPhase: createAttribute(KICK_PHASE_ATTRIBUTE),
    kickBlend: createAttribute(KICK_BLEND_ATTRIBUTE),
  };
};

/**
 * 걷기 셰이더를 심은 머티리얼 사본.
 *
 * `useGLTF` 캐시의 원본을 직접 고치면 다른 데서 쓸 때 섞임. 사본 하나를 만들어 로컬
 * 플레이어와 원격 아바타가 같이 씀. 컴포넌트마다 만들면 같은 프로그램을 두 번
 * 컴파일함.
 */
const skinnedMaterials = new WeakMap<Material, Material>();

/**
 * 글린트가 없는 모델(곰)에서는 `source` 가 `null` 이라 그대로 `null` 을 돌려줌.
 *
 * 오버로드를 두는 이유는 몸통 머티리얼이 **늘 있어서**임. 반환형을 `Material | null`
 * 하나로 두면 호출부마다 없을 수도 있는 값처럼 다뤄야 함.
 */
export function useSkinnedCrewMaterial(
  source: Material,
  walkTexture: Texture,
  kickTexture: Texture,
): Material;
export function useSkinnedCrewMaterial(
  source: Material | null,
  walkTexture: Texture,
  kickTexture: Texture,
): Material | null;
export function useSkinnedCrewMaterial(
  source: Material | null,
  walkTexture: Texture,
  kickTexture: Texture,
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
    applyCrewSkinning(material, walkTexture, kickTexture);
    skinnedMaterials.set(source, material);

    return material;
  }, [source, walkTexture, kickTexture]);
}

/**
 * 발차기 진행도와 섞는 비율.
 *
 * `startedAt` 이 없거나 연출 시간이 지났으면 안 섞음. 시작·끝 `blendInRatio` 구간은
 * 걷기에서 부드럽게 넘어가고 돌아옴.
 */
export const resolveKickPose = (
  startedAt: number | undefined,
  now: number,
  durationSeconds: number,
  blendInRatio: number,
): { phase: number; blend: number } => {
  if (startedAt === undefined) {
    return { phase: 0, blend: 0 };
  }
  const phase = (now - startedAt) / (durationSeconds * 1000);

  if (phase < 0 || phase >= 1) {
    return { phase: 0, blend: 0 };
  }
  const edge = Math.min(phase, 1 - phase) / blendInRatio;
  const ramp = Math.min(1, edge);

  return { phase, blend: ramp * ramp * (3 - 2 * ramp) };
};
