import { memo, useCallback, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import router from "@/app/router";
import "./Content.scss";

const Content = () => {


  // region [Hooks]

  const prevPathname = useRef<string | null>(null);
  const locate = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  // endregion


  // region [Privates]

  const initializeAnimation = useCallback(() => {

    const navList = router.navigationRouteList;
    const currentIdx = navList.findIndex(nav => nav.path === locate.pathname);
    const prevIdx = navList.findIndex(nav => nav.path === prevPathname.current);

    if (prevIdx !== -1) {

      const routeDirection = currentIdx < prevIdx ? 'right' : 'left';

      setTimeout(() => {
        mainRef.current?.classList.add(routeDirection === 'right' ? 'only-btc__layout--enter-right' : 'only-btc__layout--enter-left');
      }, 2);

    } else {
      setTimeout(() => { mainRef.current?.classList.add('only-btc__layout--enter-first'); }, 2);
    }

    prevPathname.current = locate.pathname;
  }, [locate.pathname]);

  // endregion


  // region [APIs]

  const handlePageLoaded = useCallback(() => {

    initializeAnimation();
  }, [initializeAnimation]);

  const handlePageUnloaded = useCallback(() => {

      mainRef.current?.classList.remove(
        'only-btc__layout--enter-right',
        'only-btc__layout--enter-left',
        'only-btc__layout--enter-first'
      );
  }, []);

  // endregion


  return (
    <main ref={mainRef} className="only-btc__layout__content">
      <Outlet context={{ onPageLoaded: handlePageLoaded, onPageUnloaded: handlePageUnloaded }} />
    </main>
  );
};

export default memo(Content);
