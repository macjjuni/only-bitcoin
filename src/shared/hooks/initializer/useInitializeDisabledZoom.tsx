import { useCallback, useEffect } from "react";


export default function useInitializeDisabledZoom() {


  // region [Privates]
  // endregion


  // region [Privates]

  const preventEvent = useCallback((e: UIEvent | Event) => {
    e.preventDefault();
  }, []);

  const disabledZoomEvent = useCallback(() => {
    document.addEventListener("gesturestart" as unknown as keyof WindowEventMap, preventEvent, { passive: false });
    document.addEventListener("dblclick", preventEvent, { passive: false });
  }, []);

  const enabledZoomEvent = useCallback(() => {
    document.removeEventListener("gesturestart" as unknown as keyof WindowEventMap, preventEvent);
    document.removeEventListener("dblclick", preventEvent);
  }, []);

  // endregion


  // region [LifeCycles]

  useEffect(() => {
    disabledZoomEvent();

    return () => {
      enabledZoomEvent();
    }
  }, []);

  // endregion
}
