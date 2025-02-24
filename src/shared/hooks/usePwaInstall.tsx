import { useCallback } from "react";
import { setCookie } from "@/shared/utils/cookie";
import useStore from "@/shared/stores/store";
import { BeforeInstallPromptEvent } from "@/shared/stores/store.interface";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";


export default function usePwaInstall() {


  // region [Hooks]

  const deferredPrompt = useStore(state => state.setting.deferredPrompt);
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt);

  // endregion


  // region [Privates]

  const initializeDeferredPrompt = useCallback((e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);
  }, []);

  const initializePwaInstall = useCallback(() => {
    window.addEventListener("beforeinstallprompt", initializeDeferredPrompt);
  }, []);

  const onNoRenderOneDay = useCallback(() => {
    setCookie(PWA_COOKIE_KEY, "_", 1);
  }, []);

  // endregion


  // region [Events]

  const onClickInstall = useCallback(async () => {

    if (deferredPrompt) {
      await deferredPrompt.prompt();

      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult?.outcome === "accepted") {
        console.log("사용자가 PWA를 설치했습니다.");
      } else {
        window.location.reload();
      }
    }
  }, [deferredPrompt]);

  const onClickDisabled = useCallback(() => {
    onNoRenderOneDay();
  }, []);

  // endregion


  // region [Life Cycles]
  // endregion


  return { deferredPrompt, onClickInstall, onClickDisabled, initializePwaInstall };
}
