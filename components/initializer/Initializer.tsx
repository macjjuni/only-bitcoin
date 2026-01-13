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
import { getToastProps } from "@/shared/config/toast";
import { KToast } from "kku-ui";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import PwaRegister from "@/components/initializer/PwaRegister";

const AlarmManager = dynamic(() => import("@/components/feedbacks/AlarmManager"), { ssr: false });


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
      <PwaRegister />
      <BaseInitializer />
      <AlarmManager />
    </Suspense>
  );
}