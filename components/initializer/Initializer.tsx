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
import { Suspense } from "react";
import dynamic from "next/dynamic";

const AlarmManager = dynamic(() => import('@/components/alarm/AlarmManager'), { ssr: false});


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

  return (<KToast {...getToastProps()} offset={120} />);
}

export default function Initializer() {
  return (
    <Suspense fallback={null}>
      <BaseInitializer />
      <AlarmManager />
    </Suspense>
  );
}