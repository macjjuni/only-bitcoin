import { useCallback, useEffect } from "react";
import { useLocation } from "react-router";

export default function useInitializeDisabledZoom() {


  // region [Hooks]

  const locate = useLocation();

  // endregion


  // region [Privates]

  const preventEvent = useCallback((e: UIEvent | Event) => {
    e.preventDefault();
  }, []);


  const enabledZoomEvent = useCallback(() => {
    document.removeEventListener("gesturestart" as unknown as keyof WindowEventMap, preventEvent);
    document.removeEventListener("dblclick", preventEvent);
  }, []);

  const disabledZoomEvent = useCallback(() => {
    enabledZoomEvent();
    document.addEventListener("gesturestart" as unknown as keyof WindowEventMap, preventEvent, { passive: false });
    document.addEventListener("dblclick", preventEvent, { passive: false });
  }, []);

  // endregion


  // region [LifeCycles]

  useEffect(() => {

    disabledZoomEvent();

    return () => { enabledZoomEvent(); };
  }, []);

  useEffect(() => {

    if (locate.pathname.includes('meme')) {
      enabledZoomEvent();
    } else {
      disabledZoomEvent();
    }
  }, [locate.pathname]);

  // endregion
}
