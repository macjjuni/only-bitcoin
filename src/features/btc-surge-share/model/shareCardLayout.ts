/** 공유 카드 레이아웃. 정사각은 인스타 · 카톡, 가로형은 X 타임라인에 맞춘 비율이다. */
export type ShareCardLayout = "square" | "wide";

export const SHARE_CARD_LAYOUT_LIST: readonly ShareCardLayout[] = ["square", "wide"];

export const DEFAULT_SHARE_CARD_LAYOUT: ShareCardLayout = "square";

export const SHARE_CARD_LAYOUT_LABEL: Record<ShareCardLayout, string> = {
  square: "정사각",
  wide: "가로형",
};

/**
 * 저장된 레이아웃이 현재 지원 목록에 있는지 확인한다.
 *
 * 알 수 없는 값이 복원되면 레이아웃별 설정 조회가 `undefined` 가 되어 다이얼로그가
 * 통째로 깨지므로 기본값으로 되돌린다.
 */
export function normalizeShareCardLayout(layout: unknown): ShareCardLayout {
  return SHARE_CARD_LAYOUT_LIST.includes(layout as ShareCardLayout)
    ? (layout as ShareCardLayout)
    : DEFAULT_SHARE_CARD_LAYOUT;
}
