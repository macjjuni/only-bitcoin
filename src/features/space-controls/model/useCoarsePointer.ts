"use client";

import { useEffect, useState } from "react";

const COARSE_POINTER_QUERY = "(pointer: coarse)";

/**
 * 손가락으로 조작하는 기기인지.
 *
 * 화면 폭으로 가르면 세로로 세운 태블릿(820 px)이 데스크톱으로 분류돼 조이스틱이
 * 사라진다. 입력 방식 자체를 묻는 쪽이 정확하다.
 */
const useCoarsePointer = (): boolean => {
  // region [Hooks]
  // 첫 렌더에서 바로 읽는다. 뒤늦게 바뀌면 카메라 시작 거리가 한 박자 튄다.
  const [isCoarsePointer, setIsCoarsePointer] = useState<boolean>(() => {
    return typeof window === "undefined" ? false : window.matchMedia(COARSE_POINTER_QUERY).matches;
  });
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const mediaQueryList = window.matchMedia(COARSE_POINTER_QUERY);

    const applyMediaQueryState = (): void => {
      setIsCoarsePointer(mediaQueryList.matches);
    };

    applyMediaQueryState();
    mediaQueryList.addEventListener("change", applyMediaQueryState);

    return () => {
      mediaQueryList.removeEventListener("change", applyMediaQueryState);
    };
  }, []);
  // endregion

  return isCoarsePointer;
};

export default useCoarsePointer;
