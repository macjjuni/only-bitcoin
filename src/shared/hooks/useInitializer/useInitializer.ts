import { useCallback, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import upbitInitializer from "./upbit.socket";
import binanceInitializer from "./binance.socket";
import mempoolInitializer from "./mempool.socket";
import initializeBitcoinDominance from "./dominance.api";
import initializeUsdExchangeRate from "./exchangeRate.api";
import initializeFeerGreedIndex from "./feerGreedIndex.api";
import googleAnalytics from "./googleAnalytics";
import useStore from "@/shared/stores/store";
import useDisabledZoom from "@/shared/hooks/useDisabledZoom";


export default function useInitializer() {

  // region [Hooks]

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const initialPath = useStore(state => state.setting.initialPath);
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);

  useDisabledZoom();
  googleAnalytics();

  // endregion


  // region [Privates]

  const initializePage = useCallback(() => {
    if (pathname === "/") {
      navigate(initialPath, { replace: true });
    }
  }, []);


  // endregion


  // region [Life Cycles]

  // 시작 페이지 로직
  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (!isUsdtStandard) {
      initializeUsdExchangeRate().then();
    }
  }, [isUsdtStandard]);

  useLayoutEffect(() => {
    upbitInitializer();
    binanceInitializer();
    mempoolInitializer();
    initializeBitcoinDominance().then();
    initializeFeerGreedIndex().then();
  }, []);

  // endregion

}
