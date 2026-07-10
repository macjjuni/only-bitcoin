"use client";

import { useEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import type { BeforeInstallPromptEvent } from "@/shared/stores/slices/settingSlice";

export default function PwaRegister() {
  // region [Hooks]
  const setDeferredPrompt = useSettingStore((state) => state.setDeferredPrompt);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const handleCapture = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log("✅ Early Capture: beforeinstallprompt");
    };

    window.addEventListener("beforeinstallprompt", handleCapture);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleCapture);
    };
  }, [setDeferredPrompt]);
  // endregion

  return null;
}
