"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** 모션 축소 설정 여부. 카메라 추종 감쇠를 바꾸는 데 쓴다. */
const usePrefersReducedMotion = (): boolean => {
  // region [Hooks]
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);

    const applyMediaQueryState = (): void => {
      setPrefersReducedMotion(mediaQueryList.matches);
    };

    applyMediaQueryState();
    mediaQueryList.addEventListener("change", applyMediaQueryState);

    return () => {
      mediaQueryList.removeEventListener("change", applyMediaQueryState);
    };
  }, []);
  // endregion

  return prefersReducedMotion;
};

export default usePrefersReducedMotion;
