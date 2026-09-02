const TOGGLE_BASE_CLASS =
  "h-7 rounded-md border border-dashed px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors active:scale-[0.97]";
const TOGGLE_ON_CLASS = "border-bitcoin/60 bg-bitcoin/15 text-bitcoin";
const TOGGLE_OFF_CLASS =
  "border-neutral-400/50 text-muted-foreground dark:border-neutral-600 dark:bg-neutral-800/40";

/**
 * 디버그 패널 토글 버튼 스타일.
 *
 * 밀도·일시정지·진단 버튼이 한 줄에 섞여 서 있어서 생김새가 어긋나면 바로 눈에 띈다.
 * 점선 테두리는 이 블록이 제품 UI 가 아니라 개발용 조작임을 알리는 표식이라
 * 패널 바깥 테두리와 같은 선을 쓴다.
 */
export function resolveToggleClass(isOn: boolean): string {
  return `${TOGGLE_BASE_CLASS} ${isOn ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`;
}
