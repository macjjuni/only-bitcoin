"use client";

import { useCallback, useEffect, useState } from "react";
import { isStandaloneRuntime } from "./isStandaloneRuntime";

interface StandaloneRuntimeState {
  isRuntimeChecked: boolean;
  isStandalone: boolean;
  refreshStandaloneRuntime: () => boolean;
}

// region [Privates]
const subscribeStandaloneDisplayMode = (
  standaloneDisplayModeQuery: MediaQueryList,
  onChangeStandaloneDisplayMode: () => void,
): (() => void) => {
  if (typeof standaloneDisplayModeQuery.addEventListener === "function") {
    standaloneDisplayModeQuery.addEventListener("change", onChangeStandaloneDisplayMode);

    return () => {
      standaloneDisplayModeQuery.removeEventListener("change", onChangeStandaloneDisplayMode);
    };
  }

  standaloneDisplayModeQuery.addListener(onChangeStandaloneDisplayMode);

  return () => {
    standaloneDisplayModeQuery.removeListener(onChangeStandaloneDisplayMode);
  };
};
// endregion

/** 현재 창의 PWA standalone 실행 상태를 구독하고 필요할 때 즉시 재검사한다. */
export const useStandaloneRuntime = (): StandaloneRuntimeState => {
  // region [Hooks]
  const [isRuntimeChecked, setIsRuntimeChecked] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const refreshStandaloneRuntime = useCallback((): boolean => {
    const currentIsStandalone = isStandaloneRuntime();
    setIsStandalone(currentIsStandalone);
    setIsRuntimeChecked(true);

    return currentIsStandalone;
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const standaloneDisplayModeQuery = window.matchMedia("(display-mode: standalone)");
    const onChangeStandaloneDisplayMode = (): void => {
      refreshStandaloneRuntime();
    };
    const onAppInstalledWindow = (): void => {
      refreshStandaloneRuntime();
    };
    const unsubscribeStandaloneDisplayMode = subscribeStandaloneDisplayMode(
      standaloneDisplayModeQuery,
      onChangeStandaloneDisplayMode,
    );

    refreshStandaloneRuntime();
    window.addEventListener("appinstalled", onAppInstalledWindow);

    return () => {
      unsubscribeStandaloneDisplayMode();
      window.removeEventListener("appinstalled", onAppInstalledWindow);
    };
  }, [refreshStandaloneRuntime]);
  // endregion

  return { isRuntimeChecked, isStandalone, refreshStandaloneRuntime };
};
