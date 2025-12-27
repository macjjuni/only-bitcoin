import { memo, useCallback, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import router from "@/app/router";

const Content = () => {

  // region [Hooks]
  const prevPathname = useRef<string | null>(null);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  // endregion


  // region [Privates]
  const initializeAnimation = useCallback(() => {
    if (!mainRef.current) return;

    const navList = router.navigationRouteList;
    const currentIdx = navList.findIndex((nav) => nav.path === pathname);
    const prevIdx = navList.findIndex((nav) => nav.path === prevPathname.current);

    let animationClass = "animate-enter-first";

    if (prevIdx !== -1) {
      const routeDirection = currentIdx < prevIdx ? "right" : "left";
      animationClass = routeDirection === "right" ? "animate-enter-right" : "animate-enter-left";
    }

    mainRef.current.classList.remove(
      "opacity-0",
      "layout-max:opacity-0",
      "animate-enter-first",
      "animate-enter-right",
      "animate-enter-left"
    );

    // eslint-disable-next-line no-void
    void mainRef.current.offsetWidth;

    mainRef.current.classList.add(animationClass);

    prevPathname.current = pathname;
  }, [pathname]);
  // endregion


  // region [APIs]
  const handlePageLoaded = useCallback(initializeAnimation, [initializeAnimation]);

  const handlePageUnloaded = useCallback(() => {
    if (!mainRef.current) return;
    mainRef.current.classList.remove(
      "animate-enter-right",
      "animate-enter-left",
      "animate-enter-first"
    );
    // 다음 페이지 전환 전 초기화
    mainRef.current.classList.add("opacity-0");
  }, []);
  // endregion


  return (
    <main
      ref={mainRef}
      className={[
        'content__layout', // 스크롤 제어용
        "flex flex-col flex-auto w-full mx-auto max-w-layout opacity-0",
        // Padding: Top(Header+8), Left/Right(8), Bottom(Nav+8)
        "pt-[calc(theme(height.header)+8px)] px-2 p-[calc(theme(height.bottom-nav)+8px)]",
        "layout-max:opacity-0", // 미디어 쿼리 ($max-width-size 이하일 때 초기 opacity 0)
        "overflow-auto"
      ].filter(Boolean).join(" ")}
    >
      <Outlet context={{ onPageLoaded: handlePageLoaded, onPageUnloaded: handlePageUnloaded }}/>
    </main>
  );
};

const MemoizedContent = memo(Content);
MemoizedContent.displayName = "Content";
Content.displayName = "Content";

export default MemoizedContent;