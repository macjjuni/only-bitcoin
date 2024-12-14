import { useEffect, useLayoutEffect } from "react";

import initUpbit from "@/socket/upbit";
import initBinance from "@/socket/binance";
import GoogleGA from "@/components/initial/GoogleGA";
import AdsenseCodeSnippet from "@/components/initial/AdSenseCodeSnippet";
import BtcBlockInit from "@/components/initial/BtcBlockInit";
import DominanceInit from "./DominanceInit";
import FeargreedInit from "./FeargreedInit";
import { isDev } from "@/utils/common";
import getUsdExchangeRate from "@/api/exchangeRate";
import { bearStore, useBearStore } from "@/store";

// 초기화 HOC
export default function Initializer() {
  GoogleGA();

  const isUsdtRateEnabled = useBearStore(state => state.isUsdtRateEnabled);

  useLayoutEffect(() => {
    initBinance();
    initUpbit();
  }, []);

  useEffect(() => {
    if (!isUsdtRateEnabled) { getUsdExchangeRate().then(bearStore.setExRate); }
  }, [isUsdtRateEnabled]);

  return (
    <>
      {/* BTC Block 초기화 */}
      <BtcBlockInit />
      {/* BTC 도미넌스 초기화 */}
      <DominanceInit />
      {/* 공포 탐욕 지수 초기화 */}
      <FeargreedInit />
      {/* 애드센스... 승인 될 수 있으려나.. */}
      {!isDev && <AdsenseCodeSnippet />}
    </>
  );
}
