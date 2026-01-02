import { useEffect } from "react";


export interface UsePageAnimation {
  onPageLoaded: () => void;
  onPageUnloaded: () => void;
}


export default function usePageAnimation({onPageLoaded, onPageUnloaded}: UsePageAnimation) {

  useEffect(() => {
    onPageLoaded();

    return () => onPageUnloaded();
  }, []);
}
