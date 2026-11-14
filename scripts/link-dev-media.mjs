import { existsSync, symlinkSync } from "node:fs";

/**
 * 개발 서버가 저장소의 `media/` 음원을 바로 읽게 `public/dev-media` 링크를 검.
 *
 * 배경음악은 배포본 용량에서 빼려고 `media/` 에 두고 jsDelivr 가 GitHub 커밋에서 받아감
 * (`spaceBgmTrack.ts`). 그래서 새 음원은 커밋·푸시 전에는 주소가 없어 로컬에서 들어 볼 수 없었음.
 * 링크는 커밋하지 않음(`.gitignore`). 배포 빌드에는 없어서 음원이 배포본에 실리지 않음.
 */
const LINK_PATH = "public/dev-media";

if (!existsSync(LINK_PATH)) {
  try {
    symlinkSync("../media", LINK_PATH, "dir");
  } catch (error) {
    // 링크를 못 걸어도 개발 서버는 떠야 함. 배경음악만 안 나옴.
    console.warn(
      `[media:link] ${LINK_PATH} 링크를 걸지 못했습니다. 배경음악이 안 나옵니다.`,
      error,
    );
  }
}
