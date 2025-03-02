import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const mode = import.meta.env.MODE;
const GA_TRACKING_ID = import.meta.env.VITE_GA_TRAKING_ID;

export default function useInitializeGA() {

  // region [Hooks]

  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  // endregion


  // region [Life Cycles]

  // 개발서버는 제외
  useEffect(() => {
    if (mode === "development") return;
    ReactGA.initialize(GA_TRACKING_ID);
    setInitialized(true);
  }, []);

  // location 변경시 pageview 이벤트 전송
  useEffect(() => {
    if (!initialized) return;
    ReactGA.set({ page: location.pathname });
    ReactGA.send("pageview");
  }, [initialized, location]);

  // endregion
};