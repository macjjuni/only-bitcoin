interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

/** 현재 탭이 홈 화면에서 실행된 standalone PWA인지 확인한다. */
export const isStandaloneRuntime = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const isStandaloneDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;

  return isStandaloneDisplayMode || navigatorWithStandalone.standalone === true;
};
