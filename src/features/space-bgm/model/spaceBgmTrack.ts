import type { SpaceHallBgmTrack } from "@/entities/space";

/**
 * 음원을 읽어올 GitHub 커밋.
 *
 * **브랜치명(`main`)을 쓰면 안 된다.** jsDelivr 는 `@main` → 커밋 매핑을 12 시간
 * 캐시하고, 이 매핑은 경로 퍼지(`purge.jsdelivr.net`)로도 지워지지 않는다.
 * 실제로 음원을 교체해 푸시하고 퍼지까지 했는데 옛 파일이 계속 내려왔다.
 *
 * 커밋을 박으면 즉시 반영되고 `immutable` 1 년 캐시까지 받는다(브랜치는 7 일).
 *
 * **음원을 추가·교체하면 그 파일이 든 커밋 해시로 이 값을 바꿔야 한다.**
 * 바꾸지 않으면 옛 커밋의 음원이 계속 나온다.
 *
 * 지금은 급등락 곡만 이 값을 씀. 곡마다 커밋을 따로 박아서, 한 곡을 바꿔도 다른 곡 주소는
 * 그대로라 재방문자가 다시 받지 않음.
 */
const BGM_SOURCE_REF = "d5ca1aa3444e7c95ed5e249c4aa16e4fb00a056c";

/**
 * 배경음악 음원.
 *
 * 배포본 용량에서 음원을 빼기 위해 저장소 파일을 그대로 CDN 으로 받는다.
 * 그래서 음원은 `public/` 이 아니라 `media/` 에 둔다. `public/` 로 옮기면 쓰지도
 * 않는 음원(20 MB 남짓)이 배포본에 다시 실린다. 커밋은 되어 있어야 CDN 이 받아갈 수 있다.
 *
 * 단지 사진이 쓰는 raw.githubusercontent.com 을 쓰지 않는 이유가 둘 있다.
 * 1. raw 는 `.mp3` 를 `application/octet-stream` 으로 내리고 `nosniff` 까지 붙여
 *    미디어 Content-Type 을 따지는 브라우저에서 재생이 막힌다. jsDelivr 는
 *    `audio/mpeg` 를 준다.
 * 2. raw 의 `max-age=300` 으로는 재방문자가 음원을 매번 다시 받는다.
 *    jsDelivr 는 7 일( `max-age=604800` )이다.
 *
 * `Access-Control-Allow-Origin: *` 과 `Accept-Ranges: bytes` 를 내려주므로
 * 교차 출처 스트리밍에 별도 프록시가 필요 없다. 다만 `media-src` 에 이 호스트가
 * 없으면 CSP 가 막으므로 `next.config.ts` 와 함께 고쳐야 한다.
 *
 * YouTube 임베드로 소리만 뽑는 방식은 쓰지 않는다. 숨긴 플레이어는 YouTube
 * 약관(플레이어 노출 요구)에 걸리고, 권리사가 임베드를 막은 영상은 재생 자체가
 * 실패한다.
 */
const toCdnBgmUrl = (sourceRef: string, fileName: string): string => {
  return `https://cdn.jsdelivr.net/gh/macjjuni/only-bitcoin@${sourceRef}/media/${fileName}`;
};

/**
 * 음원 주소를 만듦. 개발 서버에서는 CDN 대신 저장소의 `media/` 를 바로 읽음.
 *
 * CDN 은 푸시된 커밋에서만 받아가서, 새 음원을 커밋 전에 로컬에서 들어 볼 방법이 없었음.
 * `pnpm dev` 가 `public/dev-media` → `media/` 링크를 걸어 둠(`scripts/link-dev-media.mjs`).
 * 배포본은 늘 CDN 주소를 씀.
 *
 * @param sourceRef 음원이 든 커밋 해시.
 */
export const resolveBgmUrl = (
  sourceRef: string,
  fileName: string,
  isDevelopment = process.env.NODE_ENV === "development",
): string => {
  return isDevelopment ? `/dev-media/${fileName}` : toCdnBgmUrl(sourceRef, fileName);
};

/** 기본 곡이 든 커밋. 곡을 교체하면 이 값만 바꿈. */
const BASE_BGM_SOURCE_REF = "0f7401ae4927dae3a4a3e9755789b9c7c3cbf50a";

/**
 * 홀 기본 곡. 카페에서 듣기 편한 4분짜리 재즈 피아노 연주곡이고 ElevenLabs Music 으로 만들었음.
 *
 * 전에는 15분짜리 곡(13 MB)이었는데 이 곡(5.8 MB)으로 바꿨음.
 */
export const SPACE_BGM_TRACK_SRC = resolveBgmUrl(BASE_BGM_SOURCE_REF, "cafe-piano.mp3");

/**
 * 바리스타 NPC 메뉴에 띄우는 곡 이름. 곡 목록(`SPACE_HALL_BGM_TRACKS`)과 같은 키임.
 *
 * 곡을 더하려면 목록에 키를 더하고, 여기 이름과 `useSpaceBgm` 의 음원·음량을 채우고,
 * 워커를 다시 배포함. 서버가 같은 목록으로 요청을 검사함.
 */
export const SPACE_HALL_BGM_TRACK_LABELS: Readonly<Record<SpaceHallBgmTrack, string>> = {
  base: "기본 곡",
  surge: "급등락 곡",
  rush: "신나는 곡 1",
  phonk: "신나는 곡 2",
};

/**
 * 바리스타 메뉴의 "급등락 곡".
 *
 * 전에는 시세가 급등락할 때 자동으로 깔던 곡이라 키가 `surge` 임. 지금은 자동으로 안 바뀌고
 * 바리스타에게 골라야만 나옴. 키는 서버가 요청을 검사하는 목록에 있어서 그대로 둠.
 * 고른 사람이 있을 때만 6.2 MB 를 받음.
 */
export const SPACE_BGM_SURGE_TRACK_SRC = resolveBgmUrl(BGM_SOURCE_REF, "nervous.mp3");

/**
 * 레이드 곡이 든 커밋.
 *
 * 다른 곡의 커밋 값을 같이 쓰지 않고 따로 박음. 같이 쓰면 이 곡을 교체할 때 다른 곡 주소까지
 * 바뀌어 재방문자가 전부 다시 받음. 레이드 곡을 교체하면 이 값만 바꿈.
 */
const RAID_BGM_SOURCE_REF = "cc264357014f9f4cdabb587ee1d990fa6c28c3a6";

/**
 * 안뜰에서 보스가 떠 있는 동안 까는 보스전 곡.
 *
 * 처음 틀 때 받기 시작함. 홀에만 머무는 사람은 5.8 MB 를 안 받음.
 */
export const SPACE_BGM_RAID_TRACK_SRC = resolveBgmUrl(RAID_BGM_SOURCE_REF, "raid-mine.mp3");

/**
 * 기본 음량.
 *
 * 1.0 은 다른 탭 소리를 덮는다. 전광판을 보며 머무는 공간의 배경음이라
 * 대화·알림을 가리지 않는 선으로 낮춰 둔다.
 *
 * 음원이 조용하게 녹음돼 있어(평균 −23.6 dB) 숫자는 커 보여도 실제로는 작게 들림.
 * 예전 기본 곡(−16.0 dB 를 0.12 로 틂)보다 1 dB 쯤 작은 크기임.
 */
export const SPACE_BGM_VOLUME = 0.25;

/**
 * 급등락 곡 음량.
 *
 * 음원 자체가 기본 곡보다 10 dB 크게 녹음돼 있음(평균 −13.2 dB 대 −23.6 dB). 0.15 로 틀 때는
 * 시끄러웠음. 0.09 면 기본 곡보다 1.5 dB 큰 정도로 들림.
 * 홀 곡으로 골라 오래 트는 곡이라 더 튀면 안 됨.
 */
export const SPACE_BGM_SURGE_VOLUME = 0.09;

/** 안뜰 대기 곡이 든 커밋. 따로 박는 이유는 `RAID_BGM_SOURCE_REF` 와 같음. */
const COURTYARD_BGM_SOURCE_REF = "70bcf2401b9b2508aac8acd325a0e88e1fc53e43";

/**
 * 안뜰에서 보스가 없는 동안 까는 대기 곡.
 *
 * 보스는 2시간마다 떠서 안뜰은 대부분 비어 있음. 그동안 보스전 곡을 틀면 어색해서
 * 낮게 깔리는 곡을 따로 둠. ElevenLabs Music 으로 만들었음.
 */
export const SPACE_BGM_COURTYARD_TRACK_SRC = resolveBgmUrl(
  COURTYARD_BGM_SOURCE_REF,
  "courtyard-wait.mp3",
);

/**
 * 안뜰 대기 곡 음량.
 *
 * 음원이 평균 −19.1 dB 로 녹음돼 있어, 0.15 로 틀면 기본 곡(−23.6 dB 를 0.25 로 틂)과 같은 크기로 들림.
 */
export const SPACE_BGM_COURTYARD_VOLUME = 0.15;

/** 신나는 곡 1 이 든 커밋. 따로 박는 이유는 `RAID_BGM_SOURCE_REF` 와 같음. */
const RUSH_BGM_SOURCE_REF = "0f7401ae4927dae3a4a3e9755789b9c7c3cbf50a";

/**
 * 바리스타 메뉴의 "신나는 곡 1". 밝은 장조의 124 BPM EDM 연주곡(4분)이고 ElevenLabs Music 으로
 * 만들었음. 긴장감 있는 곡을 먼저 만들었는데 오래 들으면 머리가 아파서 밝은 곡으로 바꿨음.
 *
 * 바리스타에게 골라야만 나옴. 고른 사람이 있을 때만 받기 시작해서, 안 고르면 5.8 MB 를 안 받음.
 */
export const SPACE_BGM_RUSH_TRACK_SRC = resolveBgmUrl(RUSH_BGM_SOURCE_REF, "edm-upbeat.mp3");

/**
 * 신나는 곡 1 음량.
 *
 * 음원이 가장 크게 녹음돼 있음(평균 −11.5 dB). 0.075 면 급등락 곡(−13.2 dB 를 0.09 로 틂)과
 * 같은 크기로 들림.
 */
export const SPACE_BGM_RUSH_VOLUME = 0.075;

/** 신나는 곡 2 가 든 커밋. 따로 박는 이유는 `RAID_BGM_SOURCE_REF` 와 같음. */
const PHONK_BGM_SOURCE_REF = "0f7401ae4927dae3a4a3e9755789b9c7c3cbf50a";

/**
 * 바리스타 메뉴의 "신나는 곡 2". 찌그러진 808 과 카우벨이 이끄는 130 BPM 브라질리언 펑크 풍
 * 연주곡(2분 40초)이고 ElevenLabs Music 으로 만들었음.
 *
 * 발매곡을 그대로 틀면 저작권에 걸려서 장르 특징만 가지고 새로 만들었음.
 * 바리스타에게 골라야만 나오고, 고른 사람이 있을 때만 3.9 MB 를 받음.
 */
export const SPACE_BGM_PHONK_TRACK_SRC = resolveBgmUrl(PHONK_BGM_SOURCE_REF, "phonk.mp3");

/**
 * 신나는 곡 2 음량.
 *
 * 음원이 평균 −14.9 dB 로 녹음돼 있어, 0.11 이면 급등락 곡(−13.2 dB 를 0.09 로 틂)과 같은 크기로 들림.
 */
export const SPACE_BGM_PHONK_VOLUME = 0.11;

/** 레이드 곡 음량. 잠깐 틀리는 연출이라 기본 곡보다 조금 크게 둠. */
export const SPACE_BGM_RAID_VOLUME = 0.15;
