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
import { DomainNoticeDialog, PWAInstallAlertBottomSheet, PWAInstallAlertIOSBottomSheet } from "@/components";
import { Suspense } from "react";


function BaseInitializer() {

  // region [Hooks]
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
  // endregion

  return (
    <>
      <KToast {...getToastProps()} offset={120} />
      <PWAInstallAlertBottomSheet />
      <PWAInstallAlertIOSBottomSheet />
      <DomainNoticeDialog />
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