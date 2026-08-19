/**
 * apartmentID → 이미지 파일명 매핑. 파일명이 ID 와 다른 단지만 등록한다.
 *
 * 사진은 캐러셀과 공유 카드가 함께 쓰므로 매핑을 한 곳에 둔다.
 * 양쪽에 복사해 두면 파일명을 고칠 때 한쪽만 고쳐 깨진 이미지가 남는다.
 */
const IMAGE_FILENAME_MAP: Record<string, string> = {
  "banpo-xi": "banpo-zai",
  "acro-river-park": "arco",
  "apgujeong-hyundai-6": "apgujeong-hyundai-6th",
  "tower-palace-1": "tower-palace-1st",
  "jamsil-else": "jamsil-els",
};

/**
 * 사진을 읽어올 GitHub 브랜치.
 *
 * 파일이 아직 머지되지 않은 브랜치에만 있으면 raw 주소가 404 가 되므로,
 * 그동안은 이 값만 작업 브랜치명( 예: `feature/btc2apartment` )으로 바꿔 쓴다.
 */
const IMAGE_SOURCE_BRANCH = "main";

/** 단지 사진 CDN 베이스. 배포본 용량에서 사진을 빼기 위해 GitHub raw 를 쓴다. */
const IMAGE_BASE_URL = `https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/${IMAGE_SOURCE_BRANCH}/public/images/apartments`;

/**
 * 단지 사진 주소.
 *
 * 교차 출처라 공유 카드 캡처( `compositeBackground` )에서 canvas 가 오염되지 않도록
 * `crossOrigin="anonymous"` 로 받아야 한다. raw.githubusercontent.com 은
 * `Access-Control-Allow-Origin: *` 을 내려주므로 별도 프록시가 필요 없다.
 */
export function getApartmentImagePath(apartmentID: string): string {
  const filename = IMAGE_FILENAME_MAP[apartmentID] ?? apartmentID;

  return `${IMAGE_BASE_URL}/${filename}.webp`;
}

/**
 * 캡처 합성용 폭. 원본이 1120px 이라 이보다 크게 요청해도 확대되지 않는다.
 * `deviceSizes` 에 있는 값이어야 최적화기가 400 을 내지 않는다.
 */
const CAPTURE_IMAGE_WIDTH = 1200;

/**
 * 캡처 합성용 단지 사진 주소.
 *
 * GitHub raw 를 그대로 쓰지 않고 `/_next/image` 를 거치는 이유가 둘 있다.
 * 1. raw 의 `max-age=300` 대신 `minimumCacheTTL`( 7일 )이 적용된다.
 * 2. 동일 출처가 되어 화면에 이미 뜬 사진과 캐시를 공유하고, canvas 오염 위험도 사라진다.
 */
export function getApartmentCaptureImagePath(apartmentID: string): string {
  const sourceUrl = getApartmentImagePath(apartmentID);

  return `/_next/image?url=${encodeURIComponent(sourceUrl)}&w=${CAPTURE_IMAGE_WIDTH}&q=75`;
}
