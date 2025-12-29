import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { kToast } from "kku-ui";
import { Lottie } from "@/components";
import useStore from "@/shared/stores/store";
import greenDotLottie from "@/shared/assets/lottie/green-dot.json";
import redDotLottie from "@/shared/assets/lottie/red-dot.json";


const ConnectionDot = () => {

  // region [Hooks]
  const [isEnabledNetwork, setIsEnabledNetwork] = useState<boolean>(true);
  const isKrwConnected = useStore(state => state.bitcoinPrice.isKrwConnected);
  const isUsdConnected = useStore(state => state.bitcoinPrice.isUsdConnected);
  // endregion

  // region [Privates]
  const setInitState = useCallback(({ type }: Event) => {

    setIsEnabledNetwork(type === "online");
  }, []);

  const initializeEvent = useCallback(() => {

    window.addEventListener("online", setInitState);
    window.addEventListener("offline", setInitState);
  }, []);

  const clearEvent = useCallback(() => {
    window.removeEventListener("online", setInitState);
    window.removeEventListener("offline", setInitState);
  }, []);

  const showToastNetworkError = useCallback(() => {
    kToast.error("네트워크 연결을 확인해주세요.");
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (!isEnabledNetwork) {
      showToastNetworkError();
    }
  }, [isEnabledNetwork]);

  useEffect(() => {
    initializeEvent();
    return () => {
      clearEvent();
    };
  }, []);
  // endregion


  const isStable = useMemo(() => (
    !(!isEnabledNetwork || !isKrwConnected || !isUsdConnected)
  ), [isEnabledNetwork, isKrwConnected, isUsdConnected]);


  return (
    <div className="inline-flex justify-center items-center">
      {isStable ?
        <Lottie animationData={greenDotLottie} width="26px" height="26px" />
        :
        <Lottie animationData={redDotLottie} width="26px" height="26px" />
      }
    </div>
  );
};


const MemoizedConnectionDot = memo(ConnectionDot);
MemoizedConnectionDot.displayName = "ConnectionDot";

export default MemoizedConnectionDot;