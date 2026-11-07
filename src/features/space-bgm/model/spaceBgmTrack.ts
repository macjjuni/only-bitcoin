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
 */
const BGM_SOURCE_REF = "d5ca1aa3444e7c95ed5e249c4aa16e4fb00a056c";

/**
 * 배경음악 음원.
 *
 * 배포본 용량에서 음원을 빼기 위해 저장소 파일을 그대로 CDN 으로 받는다.
 * 그래서 음원은 `public/` 이 아니라 `media/` 에 둔다. `public/` 로 옮기면 쓰지도
 * 않는 13 MB 가 배포본에 다시 실린다. 커밋은 되어 있어야 CDN 이 받아갈 수 있다.
 *
 * 단지 사진이 쓰는 raw.githubusercontent.com 을 쓰지 않는 이유가 둘 있다.
 * 1. raw 는 `.mp3` 를 `application/octet-stream` 으로 내리고 `nosniff` 까지 붙여
 *    미디어 Content-Type 을 따지는 브라우저에서 재생이 막힌다. jsDelivr 는
 *    `audio/mpeg` 를 준다.
 * 2. raw 의 `max-age=300` 으로는 재방문자가 13 MB 를 매번 다시 받는다.
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
const BGM_BASE_URL = `https://cdn.jsdelivr.net/gh/macjjuni/only-bitcoin@${BGM_SOURCE_REF}/media`;

export const SPACE_BGM_TRACK_SRC = `${BGM_BASE_URL}/MONKEY_BGM.mp3`;

/**
 * 급등락 중에 까는 교체 트랙.
 *
 * 등락 방향은 가리지 않고 한 곡을 공용으로 씀(`priceSurge.ts`).
 * 기본 트랙과 달리 이벤트 때만 잠깐 틀어서 미리 받아 두지 않음. 켜는 사람만
 * 받는 기본 트랙보다도 드물게 쓰여 요청을 아끼는 쪽이 맞음.
 */
export const SPACE_BGM_SURGE_TRACK_SRC = `${BGM_BASE_URL}/nervous.mp3`;

/**
 * 기본 음량.
 *
 * 1.0 은 다른 탭 소리를 덮는다. 전광판을 보며 머무는 공간의 배경음이라
 * 대화·알림을 가리지 않는 선으로 낮춰 둔다.
 */
export const SPACE_BGM_VOLUME = 0.15;
