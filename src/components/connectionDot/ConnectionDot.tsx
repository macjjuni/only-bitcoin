import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import "./ConnectionDot.scss";

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
  }, [])

  const showToastNetworkError = useCallback(() => {
    toast.error('네트워크 연결을 확인해주세요.');
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
    return () => { clearEvent(); }
  }, []);
  // endregion


  const isStable = useMemo(() => (
    !(!isEnabledNetwork || !isKrwConnected || !isUsdConnected)
  ),[isEnabledNetwork, isKrwConnected, isUsdConnected])


  return (
    <div className="connection-dot">
      <span className={`connection-dot__dot ${isStable ? 'stable' : 'unstable'}`} />
    </div>
  );
};

export default memo(ConnectionDot);