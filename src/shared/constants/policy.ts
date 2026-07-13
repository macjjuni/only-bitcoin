/**
 * 개인정보처리방침 시행일.
 *
 * 방침 본문 표기와 sitemap 의 lastModified 가 같은 값을 참조한다.
 * 내용이 실질적으로 바뀔 때만 갱신한다. (배포 시각으로 대체하면 방침이
 * 바뀌지 않았는데도 크롤러에 '수정됨'으로 보고된다.)
 */
export const PRIVACY_EFFECTIVE_DATE = "2026-01-12" as const;

/** 방침 본문에 노출되는 한글 표기. */
export const PRIVACY_EFFECTIVE_DATE_LABEL = "2026년 1월 12일" as const;
