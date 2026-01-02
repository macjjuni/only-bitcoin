"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function useInitializeDisabledZoom() {
  const pathname = usePathname();

  const preventEvent = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  const enabledZoomEvent = useCallback(() => {
    document.removeEventListener("gesturestart", preventEvent);
    document.removeEventListener("dblclick", preventEvent);
  }, [preventEvent]);

  const disabledZoomEvent = useCallback(() => {
    enabledZoomEvent();
    document.addEventListener("gesturestart", preventEvent, { passive: false });
    document.addEventListener("dblclick", preventEvent, { passive: false });
  }, [enabledZoomEvent, preventEvent]);

  // 초기 실행 및 클린업
  useEffect(() => {
    return () => {
      enabledZoomEvent();
    };
  }, [enabledZoomEvent]);

  // 경로 변경 시 분기 처리
  useEffect(() => {
    if (pathname?.includes("meme")) {
      enabledZoomEvent();
    } else {
      disabledZoomEvent();
    }
  }, [pathname, enabledZoomEvent, disabledZoomEvent]);
}