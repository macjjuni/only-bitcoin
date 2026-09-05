"use client";

import { PWA_COOKIE_KEY } from "@/shared/constants/setting";
import useSettingStore from "@/shared/stores/settingStore";
import { setCookie } from "@/shared/utils/cookie";

export default function useInitializePWA() {
  // region [Hooks]
  const deferredPrompt = useSettingStore((state) => state.setting.deferredPrompt);
  const setDeferredPrompt = useSettingStore((state) => state.setDeferredPrompt);
  // endregion

  // region [Privates]
  const onNoRenderOneDay = () => {
    setCookie(PWA_COOKIE_KEY, "_", 1);
  };
  // endregion

  // region [Events]
  const onClickInstall = async () => {
    if (!deferredPrompt) {
      return null;
    }

    const currentDeferredPrompt = deferredPrompt;
    setDeferredPrompt(null);
    await currentDeferredPrompt.prompt();

    const choiceResult = await currentDeferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      console.log("사용자가 PWA를 설치했습니다.");
    }

    return choiceResult;
  };

  const onClickDisabled = onNoRenderOneDay;
  // endregion

  return { deferredPrompt, onClickInstall, onClickDisabled };
}
