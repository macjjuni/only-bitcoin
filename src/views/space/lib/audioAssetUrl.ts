import { parseModelAssetVersions, resolveVersionedModelUrl } from "./modelAssetUrl";

/**
 * `/audio` 음원 주소에 내용 해시를 붙임. 모델(`modelAssetUrl.ts`)과 같은 방식임.
 *
 * `/audio` 는 30일 캐시라 같은 주소로 음원을 바꾸면 기존 사용자는 옛 소리를 계속 들음.
 * 빌드 때 `next.config.ts` 가 파일마다 해시를 구해 넣고, 여기서 주소 뒤 `?v=` 로 붙임.
 * 음원을 같은 이름으로 덮어쓰기만 하면 다음 빌드에서 주소가 바뀜.
 *
 * 배경음악은 해당 없음. 커밋 해시가 박힌 CDN 주소를 씀(`spaceBgmTrack.ts`).
 */
const AUDIO_ASSET_VERSIONS = parseModelAssetVersions(process.env.NEXT_PUBLIC_AUDIO_ASSET_VERSIONS);

/** 빌드 해시 표로 버전 주소를 만듦. 표에 없는 파일은 주소를 그대로 돌려줌. */
export const toVersionedAudioUrl = (audioUrl: string): string => {
  return resolveVersionedModelUrl(audioUrl, AUDIO_ASSET_VERSIONS);
};
