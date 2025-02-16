import { useLayoutEffect } from "react";
import upbitInitializer from "./upbit.socket";
import binanceInitializer from "./binance.socket";
import mempoolInitializer from "./mempool.socket";
import initializeBitcoinDominance from "./dominance.api";
import initializeUsdExchangeRate from "@/shared/hooks/useInitializer/exchangeRate.api";
import initializeFeerGreedIndex from "@/shared/hooks/useInitializer/feerGreedIndex.api";


export default function useInitializer() {

  useLayoutEffect(() => {
    upbitInitializer();
    binanceInitializer();
    mempoolInitializer();
    initializeBitcoinDominance().then();
    initializeUsdExchangeRate().then();
    initializeFeerGreedIndex().then();
  }, []);

}