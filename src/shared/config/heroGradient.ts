import type { CSSProperties } from "react";

/**
 * 헤더 높이(px). `tailwind.config` 의 `spacing.header`( `h-header` )와 같은 값이어야 함.
 * 히어로가 이만큼 밀어서 그리므로 어긋나면 이음매가 보임.
 */
export const HERO_GRADIENT_HEADER_HEIGHT_IN_PX = 50;

/** 그라데이션 한 장의 높이(px). 헤더 + 히어로 상단을 덮음. */
const HERO_GRADIENT_HEIGHT_IN_PX = 340;

/**
 * 페이지 상단 오렌지 글로우.
 *
 * 바탕색 없이 **틴트만** 얹음. 아래로 비치는 게 테마 배경색이라 값 하나로 둘 다 맞음.
 * ( 라이트는 흰 바탕 위 살구빛, 다크는 검은 바탕 위 주황빛 )
 *
 * 첫 레이어는 하단 페이드임. ( 나중에 선언한 레이어일수록 아래에 깔림 )
 * 히어로 끝을 테마 배경색으로 되돌려 가로선이 안 생기게 함.
 */
const HERO_GRADIENT_IMAGE = [
  "linear-gradient(180deg, hsl(var(--background) / 0) 52%, hsl(var(--background)) 80%)",
  "radial-gradient(circle at 86% 10%, rgb(var(--bitcoin-rgb) / 0.30) 0%, rgb(var(--bitcoin-rgb) / 0) 62%)",
  "radial-gradient(circle at 2% 84%, rgb(var(--bitcoin-rgb) / 0.14) 0%, rgb(var(--bitcoin-rgb) / 0) 52%)",
  "linear-gradient(180deg, rgb(var(--bitcoin-rgb) / 0.14) 0%, rgb(var(--bitcoin-rgb) / 0) 72%)",
].join(", ");

/**
 * 헤더와 페이지 히어로가 **한 장의 그라데이션을 나눠 그리는** 배경 스타일.
 *
 * 헤더는 스크롤 컨테이너 밖, 히어로는 안이라 엘리먼트 하나로는 못 덮음.
 * ( 컨테이너가 `overflow` 로 잘라내서 음수 top 을 준 절대 배치도 헤더까지 못 올라감 )
 * 그래서 둘이 같은 그림을 같은 크기로 깔고, 히어로만 헤더 높이만큼
 * 위로 밀어( `background-position` ) 잘린 뒷부분을 이어 그림.
 *
 * @param offsetTopInPx 그라데이션의 몇 px 지점부터 그릴지. 헤더는 0.
 */
export function buildHeroGradientStyle(offsetTopInPx: number): CSSProperties {
  return {
    backgroundImage: HERO_GRADIENT_IMAGE,
    backgroundRepeat: "no-repeat",
    backgroundSize: `100% ${HERO_GRADIENT_HEIGHT_IN_PX}px`,
    backgroundPosition: `0 -${offsetTopInPx}px`,
  };
}
