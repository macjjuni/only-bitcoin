"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 10;
const HEADER_HEIGHT = 50;
const OVERSCROLL_MARGIN = 10;

export default function useScrollDirection() {
  // region [Hooks]
  const pathname = usePathname();
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  // endregion

  // region [Events]
  const onScroll = useCallback(() => {
    const scrollContainer = document.querySelector(".only-btc__content");
    if (!scrollContainer) return;

    const currentScrollY = scrollContainer.scrollTop;

    // 페이지 최상단 근처에서는 항상 헤더 표시
    if (currentScrollY < HEADER_HEIGHT) {
      setIsHeaderHidden(false);
      lastScrollY.current = currentScrollY;
      return;
    }

    // iOS 바닥 overscroll bounce-back을 위로 스크롤로 오감지하는 것 방지
    const maxScrollY = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const isAtBottom = lastScrollY.current >= maxScrollY - OVERSCROLL_MARGIN;

    const delta = currentScrollY - lastScrollY.current;

    // threshold 미만 스크롤은 무시 (jitter 방지)
    if (Math.abs(delta) < SCROLL_THRESHOLD) return;

    // 바닥 bounce-back에 의한 역방향 감지 무시
    if (isAtBottom && delta < 0) {
      lastScrollY.current = currentScrollY;
      return;
    }

    setIsHeaderHidden(delta > 0);
    lastScrollY.current = currentScrollY;
  }, []);
  // endregion

  // region [Life Cycles]
  // pathname 변경 시 상태 초기화
  useEffect(() => {
    setIsHeaderHidden(false);
    lastScrollY.current = 0;
  }, [pathname]);

  useEffect(() => {
    const scrollContainer = document.querySelector(".only-btc__content");
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
    };
  }, [onScroll]);
  // endregion

  return isHeaderHidden;
}
