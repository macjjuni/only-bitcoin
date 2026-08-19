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

/** 단지 사진 경로. `public/images/apartments` 아래의 webp 를 가리킨다. */
export function getApartmentImagePath(apartmentID: string): string {
  const filename = IMAGE_FILENAME_MAP[apartmentID] ?? apartmentID;

  return `/images/apartments/${filename}.webp`;
}
