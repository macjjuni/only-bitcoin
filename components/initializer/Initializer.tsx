"use client";

import {
  useBinanceSocket,
  useBithumbSocket,
  useCoinbaseSocket,
  useInitializeBackground,
  useInitializeDisabledZoom,
  useInitializePage,
  useInitializePWA,
  useMempoolSocket,
  useTheme,
  useUpbitSocket,
  useUsdExchangeRate
} from "@/shared/hooks/initializer";
import { getToastProps } from "@/shared/constants/toast";
import { KToast } from "kku-ui";
import { PWAInstallAlertBottomSheet, PWAInstallAlertIOSBottomSheet } from "@/components";
import { Suspense } from "react";


function BaseInitializer() {

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

  return (
    <>
      <KToast {...getToastProps()} offset={120} />
      <PWAInstallAlertBottomSheet />
      <PWAInstallAlertIOSBottomSheet />
    </>
  );
}

export default function Initializer() {
  return (
    <Suspense fallback={null}>
      <BaseInitializer />
    </Suspense>
  );
}