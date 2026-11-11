import { useCallback, useLayoutEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";

export default function useTheme() {
  // region [Hooks]
  const theme = useSettingStore((state) => state.theme);
  // endregion

  // region [Privates]
  const initializeTheme = useCallback(() => {
    const bodyElement = window.document.body;
    // 루트 레이아웃이 OS 라이트·다크용으로 두 개를 심음. 앱 테마는 OS 설정과 따로 가므로
    // 하나만 고치면 OS 쪽 조건에 걸린 나머지가 이겨서 시스템 바 색이 어긋났음. 전부 고침.
    const metaList = document.querySelectorAll('meta[name="theme-color"]');
    const color = theme === "light" ? "#ffffff" : "#000000";

    if (theme === "light") {
      bodyElement.classList.add("light");
      bodyElement.classList.remove("dark");
    } else {
      bodyElement.classList.add("dark");
      bodyElement.classList.remove("light");
    }

    if (metaList.length > 0) {
      for (const meta of metaList) {
        meta.setAttribute("content", color);
      }
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
