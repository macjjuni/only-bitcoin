const TOGGLE_BASE_CLASS =
  "h-8 rounded-lg px-3 text-xs font-bold transition-colors active:scale-[0.97]";
const TOGGLE_ON_CLASS = "bg-bitcoin/15 text-bitcoin";
const TOGGLE_OFF_CLASS = "bg-neutral-200/70 text-muted-foreground dark:bg-neutral-800";

/**
 * 켜짐·꺼짐 토글 버튼 스타일.
 *
 * 표시 옵션 버튼과 진단 버튼이 서로 다른 파일에 있지만 같은 종류의 조작이라 생김새를
 * 공유해야 한다. 각자 클래스 문자열을 들고 있으면 한쪽만 고쳐져 어긋나기 쉽다.
 */
export function resolveToggleClass(isOn: boolean): string {
  return `${TOGGLE_BASE_CLASS} ${isOn ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`;
}
