"use client";

import { useCallback, useEffect } from "react";

/**
 * 서비스 워커 등록을 담당하는 커스텀 훅
 */
const useServiceWorker = () => {

  // region [Privates]
  const register = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service worker registration succeeded:", registration.scope);
    } catch (error) {
      console.error("❌ Service worker registration failed:", error);
    }
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, [register]);
  // endregion
};

export default useServiceWorker;