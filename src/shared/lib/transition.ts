export type TransitionDirection = "left" | "right";

/**
 * 페이지 전환 슬라이드 방향을 `<html>` 클래스로 지정.
 *
 * `globals.css` 의 `html.slide-left` / `html.slide-right` 규칙이 이 클래스를 읽어
 * `::view-transition-new(root)` 의 진입 방향을 결정.
 * 클래스는 한 번 붙으면 남아 있으므로, 전환을 시작하는 모든 경로에서 매번 지정해야함.
 */
export const setTransitionDirection = (direction: TransitionDirection) => {
  const html = document.documentElement;

  html.classList.remove("slide-left", "slide-right");
  html.classList.add(`slide-${direction}`);
};

const CHAT_PANEL_RESIZE_CLASS_NAME = "chat-panel-resizing";

/**
 * 채팅 패널 전체화면 토글을 View Transition 으로 모프.
 *
 * 말풍선 <-> 전체화면은 `bottom` / `left` 가 고정 값에서 `auto` 로 바뀌어 CSS
 * transition 으로 보간되지 않으므로, 스냅샷 박스를 직접 모프하는 View Transition 을 씀.
 * `globals.css` 의 `html.chat-panel-resizing` 규칙이 이 전환에서만 `chat-panel` 그룹
 * 애니메이션을 되살리고, 남아 있는 `slide-*` 클래스 때문에 페이지 전체가 함께
 * 슬라이드되지 않도록 루트 스냅샷 애니메이션을 끔.
 */
export const runChatPanelResizeTransition = (resizePanel: () => void) => {
  const html = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof document.startViewTransition !== "function" || prefersReducedMotion) {
    resizePanel();
    return;
  }

  const removeResizeClassName = (): void => {
    html.classList.remove(CHAT_PANEL_RESIZE_CLASS_NAME);
  };

  html.classList.add(CHAT_PANEL_RESIZE_CLASS_NAME);
  document
    .startViewTransition(resizePanel)
    .finished.then(removeResizeClassName, removeResizeClassName);
};
