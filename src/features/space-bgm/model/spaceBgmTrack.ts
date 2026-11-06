/**
 * 배경음악을 읽어올 GitHub ref.
 *
 * 단지 사진( `apartmentImage.ts` )과 같은 방침이다. 파일이 아직 머지되지 않은
 * 브랜치에만 있으면 주소가 404 가 되므로, 그동안은 이 값만 작업 브랜치명으로
 * 바꿔 쓴다. 음원을 교체할 때는 파일명을 바꾸거나 이 값을 태그로 고정해야 한다.
 * 브랜치 주소는 edge 12 시간·브라우저 7 일 캐시가 걸려 바로 갈리지 않는다.
 */
const BGM_SOURCE_REF = "main";

/**
 * 배경음악 음원.
 *
 * 배포본 용량에서 13 MB 음원을 빼기 위해 저장소 파일을 그대로 CDN 으로 받는다.
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
