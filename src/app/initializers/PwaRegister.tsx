"use client";

import { useCallback, useEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import type { BeforeInstallPromptEvent } from "@/shared/stores/slices/settingSlice";

export default function PwaRegister() {
  // region [Hooks]
  const setDeferredPrompt = useSettingStore((state) => state.setDeferredPrompt);
  // endregion

  // region [Events]
  const onBeforeInstallPromptWindow = useCallback(
    (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    },
    [setDeferredPrompt],
  );

  const onAppInstalledWindow = useCallback((): void => {
    setDeferredPrompt(null);
  }, [setDeferredPrompt]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", onBeforeInstallPromptWindow);
    window.addEventListener("appinstalled", onAppInstalledWindow);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPromptWindow);
      window.removeEventListener("appinstalled", onAppInstalledWindow);
    };
  }, [onAppInstalledWindow, onBeforeInstallPromptWindow]);
  // endregion

  return null;
}
