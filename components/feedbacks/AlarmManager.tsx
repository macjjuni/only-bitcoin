'use client';

import { memo, useCallback, useEffect, useState } from "react";
import { DomainNoticeDialog, PWAInstallAlertBottomSheet, PWAInstallAlertIOSBottomSheet } from "@/components/feedbacks";
import { getCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY, PWA_COOKIE_KEY } from "@/shared/constants/setting";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { isIOSPWA, isIOSSafari, isPWAInstalled, isSafari } from "@/shared/utils/device";

const AlarmManager = () => {
  type DisplayState = "NONE" | "DOMAIN" | "IOS_PWA" | "OTHER_PWA";

  // region [Hooks]
  const { deferredPrompt } = useInitializePWA();
  const [displayState, setDisplayState] = useState<DisplayState>("NONE");
  // endregion

  // region [Privates]
  const determineDisplayState = useCallback((): DisplayState => {
    // 1. 도메인 이전 공지
    const isHideDomain = !!getCookie(NOTICE_COOKIE_KEY);
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
    const isRedirected = searchParams.get("redirected") === "true";

    if (!isHideDomain && isRedirected) return "DOMAIN";

    // 2. 공통 쿠키 확인
    if (!!getCookie(PWA_COOKIE_KEY)) return "NONE";

    // 3. IOS PWA (Safari)
    if (isIOSSafari() && !isIOSPWA()) return "IOS_PWA";

    // 4. Android/Desktop PWA (deferredPrompt 존재 + standalone 모드가 아닌 경우만 체크)
    if (!isSafari() && !!deferredPrompt && !isPWAInstalled()) {
      return "OTHER_PWA";
    }

    return "NONE";
  }, [deferredPrompt]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // requestAnimationFrame으로 브라우저 렌더링이 안정화된 후 상태 체크
    const timer = requestAnimationFrame(() => {
      const nextState = determineDisplayState();
      setDisplayState(nextState);
    });

    return () => cancelAnimationFrame(timer);
  }, [determineDisplayState, deferredPrompt]); // deferredPrompt가 늦게 들어와도 다시 실행됨
  // endregion

  // region [Events]
  const renderAlarm = () => {
    switch (displayState) {
      case "DOMAIN": return <DomainNoticeDialog />;
      case "IOS_PWA": return <PWAInstallAlertIOSBottomSheet />;
      case "OTHER_PWA": return <PWAInstallAlertBottomSheet />;
      default: return null;
    }
  };
  // endregion

  return renderAlarm();
};

const MemoizedAlarmManager = memo(AlarmManager);
MemoizedAlarmManager.displayName = "AlarmManager";

export default MemoizedAlarmManager;