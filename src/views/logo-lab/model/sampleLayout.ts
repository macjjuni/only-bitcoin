/**
 * 시안 카드 공용 크기·클래스.
 *
 * 크기는 실제 사용처 그대로만 씀. 효과 체감이 크기마다 완전히 달라서 임의 크기 비교는 의미 없음.
 */

// region [Types]
export interface WordmarkSampleSize {
  id: string;
  label: string;
  widthInCssPx: number;
  heightInCssPx: number;
}
// endregion

// region [Constants]
/** 현재 `BtcTextLogo` 사용처 세 곳의 크기. */
export const WORDMARK_SAMPLE_SIZES: WordmarkSampleSize[] = [
  { id: "header", label: "헤더 132 × 32", widthInCssPx: 132, heightInCssPx: 32 },
  { id: "share-card", label: "공유 카드 156 × 36", widthInCssPx: 156, heightInCssPx: 36 },
  { id: "hero", label: "대형 264 × 64", widthInCssPx: 264, heightInCssPx: 64 },
];

export const HEADER_WORDMARK_SAMPLE_SIZE = WORDMARK_SAMPLE_SIZES[0];

/** 헤더 `KIcon` 크기와 맞춤. */
export const HEADER_ICON_SIZE_IN_CSS_PX = 30;

/** 아이콘 비교 크기. 헤더 30 · 파비콘급 48 · 대형 96. */
export const ICON_SAMPLE_SIZES_IN_CSS_PX = [HEADER_ICON_SIZE_IN_CSS_PX, 48, 96];

/** 시안을 얹는 어두운 패널. 사이퍼펑크 톤은 라이트 배경에서 평가 불가. */
export const SAMPLE_PANEL_CLASS =
  "flex flex-col gap-5 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-5";

export const SAMPLE_LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500";

export const SECTION_HEADING_CLASS =
  "font-jetbrains text-[15px] font-bold tracking-tight text-bitcoin";

export const SPEC_CLASS =
  "font-jetbrains text-[11px] leading-relaxed tracking-tight text-neutral-500";

export const TAB_INTRO_CLASS = "px-1 text-[13px] leading-relaxed text-muted-foreground";

/** 토글 버튼 공용 클래스. 선택 여부만 다름. */
export function resolveToggleButtonClass(isSelected: boolean): string {
  return [
    "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
    isSelected
      ? "border-bitcoin bg-bitcoin/15 text-bitcoin"
      : "border-neutral-700 text-neutral-400 hover:text-neutral-200",
  ].join(" ");
}
// endregion
