import { useCallback, useLayoutEffect, useState } from "react";


const defaultMobileSize = 768;

export default function useResizeOver(targetSize: number = defaultMobileSize) {

  // region [Hooks]

  const [isOver, setIsOver] = useState(true);

  // endregion


  // region [Events]

  const onResizeWindow = useCallback((e: UIEvent) => {

    setIsOver((e.target as Window).innerWidth > targetSize  );
  }, []);

  // endregion


  // region [Privates]

  const initializeIsOver = useCallback(() => {

    if (!window) { return; }

    window.addEventListener('resize', onResizeWindow);
    setIsOver(window.innerWidth > targetSize  );
  }, []);

  // endregion


  // region [Life Cycles]

  useLayoutEffect(() => initializeIsOver(), []);

  // endregion


  return {isOver};
}
