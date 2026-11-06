/**
 * 배경음악을 읽어올 GitHub 브랜치.
 *
 * 단지 사진( `apartmentImage.ts` )과 같은 방침이다. 파일이 아직 머지되지 않은
 * 브랜치에만 있으면 raw 주소가 404 가 되므로, 그동안은 이 값만 작업 브랜치명으로
 * 바꿔 쓴다.
 */
const BGM_SOURCE_BRANCH = "main";

/**
 * 배경음악 음원.
 *
 * 배포본 용량에서 13 MB 음원을 빼기 위해 GitHub raw 를 쓴다.
 * `Access-Control-Allow-Origin: *` 과 `Accept-Ranges: bytes` 를 내려주므로
 * 교차 출처 스트리밍에 별도 프록시가 필요 없다. 다만 `media-src` 에 이 호스트가
 * 없으면 CSP 가 막으므로 `next.config.ts` 와 함께 고쳐야 한다.
 *
 * YouTube 임베드로 소리만 뽑는 방식은 쓰지 않는다. 숨긴 플레이어는 YouTube
 * 약관(플레이어 노출 요구)에 걸리고, 권리사가 임베드를 막은 영상은 재생 자체가
 * 실패한다.
 */
export const SPACE_BGM_TRACK_SRC = `https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/${BGM_SOURCE_BRANCH}/public/audio/MONKEY_BGM.mp3`;

/**
 * 기본 음량.
 *
 * 1.0 은 다른 탭 소리를 덮는다. 전광판을 보며 머무는 공간의 배경음이라
 * 대화·알림을 가리지 않는 선으로 낮춰 둔다.
 */
export const SPACE_BGM_VOLUME = 0.35;
