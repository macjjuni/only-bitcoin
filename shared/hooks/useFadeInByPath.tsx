
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";


export default function useFadeInByPath() {
  // region [Hooks]
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setIsVisible(false);

    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(timer);
  }, [pathname]);
  // endregion

  // region [Privates]
  const transitionClass = "transition-opacity duration-500 ease-in-out";
  const visibilityClass = isVisible ? "opacity-100" : "opacity-0";
  // endregion

  return `${transitionClass} ${visibilityClass}`;
}