"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 라우트 전환 시 콘텐츠를 페이드인시킨다.
 *
 * 최초 렌더에서는 opacity-100 을 유지한다. 서버가 내려준 HTML 이 opacity-0 으로 시작하면
 * JS 가 실행되기 전까지 화면이 비어 보이고, 크롤러에게는 콘텐츠가 없는 페이지로 읽힌다.
 * 페이드는 클라이언트 라우팅(= pathname 변경)에서만 필요하므로 첫 마운트는 건너뛴다.
 */
export default function useFadeInByPath() {
  // region [Hooks]
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const isMountedRef = useRef(false);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // 첫 마운트는 SSR HTML 을 그대로 노출한다.
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }

    setIsVisible(false);

    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname]);
  // endregion

  // region [Privates]
  const transitionClass = "transition-opacity duration-500 ease-in-out";
  const visibilityClass = isVisible ? "opacity-100" : "opacity-0";
  // endregion

  return `${transitionClass} ${visibilityClass}`;
}
