"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 전체 화면 토글.
 *
 * 3D 공간은 화면을 넓게 쓸수록 좋지만, iOS 사파리처럼 Fullscreen API 를
 * 지원하지 않는 환경이 있다. 지원 여부를 함께 돌려줘 버튼을 숨길 수 있게 한다.
 */
export const useFullscreen = (): {
  isFullscreen: boolean;
  isFullscreenSupported: boolean;
  toggleFullscreen: () => void;
} => {
  // region [Hooks]
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState<boolean>(false);
  // endregion

  // region [Events]
  const toggleFullscreen = useCallback((): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    void document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const applyFullscreenState = (): void => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    setIsFullscreenSupported(Boolean(document.documentElement.requestFullscreen));
    applyFullscreenState();
    document.addEventListener("fullscreenchange", applyFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", applyFullscreenState);
    };
  }, []);
  // endregion

  return { isFullscreen, isFullscreenSupported, toggleFullscreen };
};
