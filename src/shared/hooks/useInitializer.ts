import {
  useInitializePWA,
  useInitializeDisabledZoom,
  useInitializeBackground,
  useUsdExchangeRate,
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
  useUsdExchangeRate();
  useInitializeDisabledZoom();
  useInitializeBackground();
  useInitializePage();
  useInitializePWA();
  useInitializeGA();
  // endregion
}
