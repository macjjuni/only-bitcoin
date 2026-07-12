import { useCallback, useEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";

export default function useInitializeBackground() {
  // region [Hooks]

  const isBackgroundImg = useSettingStore((state) => state.setting.isBackgroundImg);

  // endregion

  // region [Privates]

  const initializeBackground = useCallback(() => {
    if (isBackgroundImg) {
      document.body.classList.add("show-bg");
    } else {
      document.body.classList.remove("show-bg");
    }
  }, [isBackgroundImg]);

  // endregion

  // region [Life Cycles]

  useEffect(() => {
    initializeBackground();
  }, [isBackgroundImg]);

  // endregion
}
