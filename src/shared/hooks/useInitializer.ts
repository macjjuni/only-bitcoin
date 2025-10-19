import {
  useTheme,
  useInitializePWA,
  useInitializeDisabledZoom,
  useInitializeBackground,
  useUsdExchangeRate,
  useInitializePage,
  useInitializeGA,
  useBinanceSocket,
  useUpbitSocket,
  useMempoolSocket,
  useBithumbSocket,
} from "@/shared/hooks/initializer";


export default function useInitializer() {

  // region [Hooks]
  useTheme();
  useUpbitSocket();
  useBithumbSocket();
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
