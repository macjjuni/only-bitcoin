"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {

  // region [Hooks]
  const registerServiceWorker = async () => {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.warn("Service worker registration succeeded:", registration);
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    registerServiceWorker().then();
  }, []);
  // endregion

  return null;
}