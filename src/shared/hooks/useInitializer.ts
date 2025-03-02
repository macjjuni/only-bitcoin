import {
  useInitializePWA,
  useInitializeDisabledZoom,
  useInitializeBackground,
  useInitializeUsdExchangeRate,
  useInitializePage,
  useInitializeGA,
  useInitializeAPI
} from "@/shared/hooks/initializer";


export default function useInitializer() {

  // region [Hooks]

  useInitializeAPI();
  useInitializeUsdExchangeRate();
  useInitializeDisabledZoom();
  useInitializeBackground();
  useInitializePage();
  useInitializePWA();
  useInitializeGA();

  // endregion
}
