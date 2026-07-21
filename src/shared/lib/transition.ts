export type TransitionDirection = "left" | "right";

/**
 * 페이지 전환 슬라이드 방향을 `<html>` 클래스로 지정한다.
 *
 * `globals.css` 의 `html.slide-left` / `html.slide-right` 규칙이 이 클래스를 읽어
 * `::view-transition-new(root)` 의 진입 방향을 결정한다.
 * 클래스는 한 번 붙으면 남아 있으므로, 전환을 시작하는 모든 경로에서 매번 지정해야 한다.
 */
export const setTransitionDirection = (direction: TransitionDirection) => {
  const html = document.documentElement;

  html.classList.remove("slide-left", "slide-right");
  html.classList.add(`slide-${direction}`);
};
