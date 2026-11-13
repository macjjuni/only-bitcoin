/**
 * `/models` 에셋 주소에 내용 해시를 붙임.
 *
 * `/models` 는 30일 캐시라 같은 주소로 파일을 다시 구우면 기존 사용자는 옛
 * 모델을 계속 받음. 빌드 때 `next.config.ts` 가 파일마다 해시를 구해 넣고, 여기서
 * 주소 뒤 `?v=` 로 붙임. 내용이 바뀔 때만 주소가 바뀌어 캐시는 그대로 살림.
 *
 * 모델 목록(`entities/space`)이 아니라 여기서 붙이는 이유: 목록은 채팅 워커도
 * import 해서 `process.env` 에 기대면 안 됨. 테스트도 목록 주소로 파일을 읽음.
 */

export type ModelAssetVersions = Readonly<Record<string, string>>;

// region [Privates]
/** 빌드 때 넣은 해시 표. 값이 없거나 깨졌으면 해시 없이 원래 주소를 씀. */
export const parseModelAssetVersions = (rawVersions: string | undefined): ModelAssetVersions => {
  if (!rawVersions) {
    return {};
  }

  try {
    return JSON.parse(rawVersions) as ModelAssetVersions;
  } catch {
    return {};
  }
};

const MODEL_ASSET_VERSIONS = parseModelAssetVersions(process.env.NEXT_PUBLIC_MODEL_ASSET_VERSIONS);
// endregion

/** 파일 이름으로 해시를 찾아 붙임. 표에 없는 파일은 주소를 그대로 돌려줌. */
export const resolveVersionedModelUrl = (
  modelUrl: string,
  versions: ModelAssetVersions,
): string => {
  const fileName = modelUrl.split("/").pop() ?? "";
  const version = versions[fileName];

  return version ? `${modelUrl}?v=${version}` : modelUrl;
};

/** 빌드 해시 표로 버전 주소를 만듦. */
export const toVersionedModelUrl = (modelUrl: string): string => {
  return resolveVersionedModelUrl(modelUrl, MODEL_ASSET_VERSIONS);
};
