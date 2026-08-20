"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CONTENT_SELECTOR = ".only-btc__content";

/**
 * 진행도를 끊어 읽는 간격.
 *
 * 스크롤 이벤트마다 갱신하면 구독한 쪽이 픽셀 단위로 리렌더됨.
 * 눈에는 어차피 연속으로 보여서 20단계로 줄였음.
 */
const PROGRESS_STEP = 0.05;

/**
 * 콘텐츠가 `distanceInPx` 만큼 내려갔는지를 0~1 로 돌려줌.
 *
 * 스크롤 주체가 `window` 가 아니라 레이아웃 안쪽 컨테이너(`.only-btc__content`)라
 * `scrollY` 말고 그 엘리먼트의 `scrollTop` 을 씀.
 */
export default function useContentScrollProgress(distanceInPx: number) {
  // region [Hooks]
  const pathname = usePathname();
  const [scrollProgress, setScrollProgress] = useState(0);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const scrollContainer = document.querySelector(CONTENT_SELECTOR);

    if (!scrollContainer || distanceInPx <= 0) {
      return;
    }

    const updateScrollProgress = () => {
      const rawProgress = Math.min(1, Math.max(0, scrollContainer.scrollTop / distanceInPx));

      setScrollProgress(Math.round(rawProgress / PROGRESS_STEP) * PROGRESS_STEP);
    };

    // 라우트가 바뀌면 스크롤 위치도 초기화되므로 구독 시점에 한 번 맞춰 둠.
    updateScrollProgress();

    scrollContainer.addEventListener("scroll", updateScrollProgress, { passive: true });

    return () => scrollContainer.removeEventListener("scroll", updateScrollProgress);
  }, [distanceInPx, pathname]);
  // endregion

  return scrollProgress;
}
