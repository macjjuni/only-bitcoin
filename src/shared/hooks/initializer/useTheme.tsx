import { useCallback, useLayoutEffect } from "react";
import useStore from "@/shared/stores/store";

export default function useTitle() {

  // region [Hooks]
  const theme = useStore(state => state.theme);
  // endregion

  // region [Privates]
  const initializeTheme = useCallback(() => {

    const bodyElement = window.document.body;

    if (theme === "light") {
      bodyElement.classList.add("light");
      bodyElement.classList.remove("dark");
    } else {
      bodyElement.classList.add("dark");
      bodyElement.classList.remove("light");
    }
  }, [theme]);
  // endregion

  // region [Life Cycles]
  useLayoutEffect(initializeTheme, [theme, initializeTheme]);
  // endregion
}
