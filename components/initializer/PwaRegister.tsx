"use client";

import { useEffect } from "react";
import useStore from "@/shared/stores/store";
import { BeforeInstallPromptEvent } from "@/shared/stores/store.interface";

export default function PwaRegister() {

  // region [Hooks]
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);
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