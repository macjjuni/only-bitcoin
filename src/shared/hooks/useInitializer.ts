import {
  useInitializePWA,
  useInitializeDisabledZoom,
  useInitializeBackground,
  useInitializeUsdExchangeRate,
  useInitializePage,
  useInitializeGA,
  useBinanceSocket,
  useUpbitSocket,
  useMempoolSocket,
} from "@/shared/hooks/initializer";


export default function useInitializer() {

  // region [Hooks]
  useUpbitSocket();
  useBinanceSocket();
  useMempoolSocket();
  useInitializeUsdExchangeRate();
  useInitializeDisabledZoom();
  useInitializeBackground();
  useInitializePage();
  useInitializePWA();
  useInitializeGA();
  // endregion
}
