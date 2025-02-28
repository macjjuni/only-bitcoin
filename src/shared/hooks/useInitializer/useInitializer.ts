import { useCallback, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { dateUtil } from "kku-util";
import upbitInitializer, { reConnectUpbit } from "./upbit.socket";
import binanceInitializer, { reConnectBinance } from "./binance.socket";
import mempoolInitializer, { reconnectMempool } from "./mempool.socket";
import initializeBitcoinDominance from "./dominance.api";
import initializeUsdExchangeRate from "./exchangeRate.api";
import initializeFeerGreedIndex from "./feerGreedIndex.api";
import googleAnalytics from "./googleAnalytics";
import useStore from "@/shared/stores/store";
import useDisabledZoom from "@/shared/hooks/useDisabledZoom";
import { usePwaInstall } from "@/shared/hooks";
import storage from "@/shared/utils/storage";
import { INIT_SOCKET_TIME } from "@/shared/constants/setting";


export default function useInitializer() {

  // region [Hooks]

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const initialPath = useStore(state => state.setting.initialPath);
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const isBackgroundImg = useStore(state => state.setting.isBackgroundImg);

  useDisabledZoom();
  googleAnalytics();
  const { initializePwaInstall } = usePwaInstall();

  // endregion


  // region [Privates]

  const initializePage = useCallback(() => {
    if (pathname === "/") {
      navigate(initialPath, { replace: true });
    }
  }, []);

  const initializeBackground = useCallback(() => {
    if (isBackgroundImg) {
      document.body.classList.add("show-bg");
    } else {
      document.body.classList.remove("show-bg");
    }
  }, [isBackgroundImg]);

  const checkReconnectTime = () => {

    const leaveTime = Number(storage.getItem(INIT_SOCKET_TIME)); // 문자열 -> 숫자로 변환
    if (!leaveTime && leaveTime !== 0) return true; // NaN, null, undefined 체크

    const diffTime = dateUtil.calcCurrentDateDifference(leaveTime, 'minute');
    return diffTime > 0;
  };

  const initializeSocket = useCallback(() => {

    window.addEventListener("visibilitychange", () => {

      if (document.hidden) {
        // 사용자가 홈 화면으로 이동
        storage.setItem(INIT_SOCKET_TIME, Date.now().toString());
      } else {
        // 사용자가 앱으로 돌아옴

        if (!checkReconnectTime()) { return; }

        reConnectUpbit();
        reConnectBinance();
        reconnectMempool();
      }
    });
  }, []);

  // endregion


  // region [Life Cycles]

  // 시작 페이지 로직
  useEffect(() => {
    initializePage();
    initializePwaInstall();
    initializeSocket();
  }, []);

  // 초기 설정 셋팅
  useEffect(() => {
    initializeBackground();
  }, [isBackgroundImg]);

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
