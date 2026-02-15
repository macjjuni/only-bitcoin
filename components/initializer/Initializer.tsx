"use client";

import { memo, Suspense } from "react";
import dynamic from "next/dynamic";
import { KToast } from "kku-ui";
import { getToastProps } from "@/shared/config/toast";
import PwaRegister from "@/components/initializer/PwaRegister";
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

const AlarmManager = dynamic(() => import("@/components/feedbacks/AlarmManager"), {
  ssr: false
});

/**
 * 전역 소켓 및 상태 초기화 전용 컴포넌트
 */
function BaseInitializer() {
  // region [Hooks]
  // 외부 API/소켓 초기화
  useCoinbaseSocket();
  useUpbitSocket();
  useBithumbSocket();
  useBinanceSocket();
  useMempoolSocket();

  // 앱 설정 및 환경 초기화
  useTheme();
  useInitializePWA();
  useUsdExchangeRate();
  useInitializeDisabledZoom();
  useInitializeBackground();
  useInitializePage();
  // endregion

  return <KToast {...getToastProps()} offset={120} />;
}


const Initializer = () => {
  return (
    <>
      {/* 알람 매니저는 브라우저 API(알림)를 사용하므로 dynamic SSR false 유지 */}
      <AlarmManager />

      {/* PwaRegister와 BaseInitializer는 클라이언트 전용 로직이므로 Suspense로 묶어 초기 로딩 최적화 */}
      <Suspense fallback={null}>
        <PwaRegister />
        <BaseInitializer />
        {/* <SurpriseQuiz /> */}
      </Suspense>
    </>
  );
};

const MemoizedInitializer = memo(Initializer);
MemoizedInitializer.displayName = "Initializer";

export default MemoizedInitializer;