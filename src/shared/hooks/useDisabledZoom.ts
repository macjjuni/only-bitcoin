import { useCallback, useEffect } from "react";
import { useResizeOver } from "@/shared/hooks/index";


export default function useDisabledZoom() {


  // region [Privates]

  const { isOver: isDeskTopSize } = useResizeOver();

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

    if (!isDeskTopSize) {
      disabledZoomEvent();
    } else {
      enabledZoomEvent();
    }
  }, [isDeskTopSize]);

  // endregion
}