/**
 * 전광판 재질의 텍스처 선명도 보정.
 *
 * 폰에서는 1600 px 텍스처가 600 px 안팎으로 줄어 그려져서 GPU 가 저해상도
 * 밉맵을 섞어 씀. 그대로 두면 글자 가장자리가 뭉개짐. 샘플링에 음수 LOD
 * 바이어스를 줘서 한 단계 선명한 밉맵을 고르게 함.
 *
 * 너무 당기면 움직일 때 글자가 반짝임. -0.75 는 반짝임 없이 또렷해지는 선임.
 */
export const SCREEN_TEXTURE_LOD_BIAS = -0.75;

/** 같은 셰이더끼리만 프로그램을 나눠 쓰게 하는 캐시 키. */
const SCREEN_MATERIAL_CACHE_KEY = `space-screen-lod-bias:${SCREEN_TEXTURE_LOD_BIAS}`;

const MAP_FRAGMENT_INCLUDE = "#include <map_fragment>";

/**
 * `MeshBasicMaterial.onBeforeCompile` 에 그대로 넘김.
 *
 * three 의 `map_fragment` 를 바이어스를 준 샘플링으로 바꿈. 영상 텍스처
 * 디코딩 분기는 캔버스 텍스처에 필요 없어서 뺐음.
 */
export const sharpenScreenMapSampling = (shader: { fragmentShader: string }): void => {
  shader.fragmentShader = shader.fragmentShader.replace(
    MAP_FRAGMENT_INCLUDE,
    [
      "#ifdef USE_MAP",
      `  diffuseColor *= texture2D( map, vMapUv, ${SCREEN_TEXTURE_LOD_BIAS.toFixed(2)} );`,
      "#endif",
    ].join("\n"),
  );
};

/** `MeshBasicMaterial.customProgramCacheKey` 에 그대로 넘김. */
export const resolveScreenMaterialCacheKey = (): string => SCREEN_MATERIAL_CACHE_KEY;
