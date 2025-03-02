import { memo, useCallback, useEffect, useState } from "react";
import { KIcon } from "kku-ui";
import { toast } from "react-toastify";
import { reConnectUpbit, reConnectBinance } from "@/shared/api";
import useStore from "@/shared/stores/store";
import "./NetworkSwitch.scss";

const NetworkSwitch = () => {

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

  const refreshAction = useCallback(() => {

    if (!isKrwConnected) {
      reConnectUpbit();
    }

    if (!isUsdConnected) {
      reConnectBinance();
    }
  }, [isKrwConnected, isUsdConnected]);

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


  return (
    <div className="network__switch__area">
      {!isEnabledNetwork && <KIcon icon="disconnect" size={32} className="disconnect__icon" />}
      {
        !isKrwConnected || !isUsdConnected && (
          <KIcon icon="refresh" size={32} onClick={refreshAction} className="refresh__icon" />
        )
      }
    </div>
  );
};

export default memo(NetworkSwitch);