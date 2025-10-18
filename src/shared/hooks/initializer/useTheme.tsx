import { useCallback, useLayoutEffect } from "react";
import useStore from "@/shared/stores/store";

export default function useTitle() {

  // region [Hooks]
  const theme = useStore(state => state.theme);
  // endregion

  // region [Privates]
  const initializeTheme = useCallback(() => {

    const bodyElement = window.document.body;
    const meta = document.querySelector('meta[name="theme-color"]');
    const color = theme === "light" ? "#ffffff" : "#000000"; // 원하면 색상 변경 가능

    if (theme === "light") {
      bodyElement.classList.add("light");
      bodyElement.classList.remove("dark");
    } else {
      bodyElement.classList.add("dark");
      bodyElement.classList.remove("light");
    }

    if (meta) {
      meta.setAttribute("content", color);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "theme-color";
      newMeta.content = color;
      document.head.appendChild(newMeta);
    }
  }, [theme]);
  // endregion

  // region [Life Cycles]
  useLayoutEffect(initializeTheme, [theme, initializeTheme]);
  // endregion
}
