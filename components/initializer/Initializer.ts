'use client';

import {
  useTheme,
  useInitializePWA,
  useInitializeDisabledZoom,
  useInitializeBackground,
  useUsdExchangeRate,
  useInitializePage,
  useBinanceSocket,
  useUpbitSocket,
  useMempoolSocket,
  useBithumbSocket,
  useCoinbaseSocket,
} from "@/shared/hooks/initializer";

export default function Initializer() {

  useCoinbaseSocket();
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

  return null;
}