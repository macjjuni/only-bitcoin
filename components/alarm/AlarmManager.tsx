"use client";

import React, { memo, useState, useEffect, useCallback } from "react";
import { DomainNoticeDialog, PWAInstallAlertBottomSheet, PWAInstallAlertIOSBottomSheet } from "@/components";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { getCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY, PWA_COOKIE_KEY } from "@/shared/constants/setting";
import { isIOSPWA, isIOSSafari } from "@/shared/utils/device";

type DisplayState = "NONE" | "DOMAIN" | "IOS_PWA" | "OTHER_PWA";

const AlarmManager = () => {
  // region [Hooks]
  const { deferredPrompt } = useInitializePWA();
  const [displayState, setDisplayState] = useState<DisplayState>("NONE");
  // endregion

  // region [Privates]
  const determineDisplayState = useCallback((): DisplayState => {
    // 1. 도메인 이전 공지 판단
    const isHideDomain = !!getCookie(NOTICE_COOKIE_KEY);
    const searchParams = new URLSearchParams(window.location.search);
    const isRedirected = searchParams.get("redirected") === "true";

    if (!isHideDomain && isRedirected) {
      return "DOMAIN";
    }

    // 2. 공통 쿠키 확인 (오늘 하루 안보기)
    const isHidePWA = !!getCookie(PWA_COOKIE_KEY);
    if (isHidePWA) return "NONE";

    // 3. IOS PWA 판단 (Safari 브라우저이며 아직 홈화면에 추가되지 않은 경우)
    if (isIOSSafari() && !isIOSPWA()) {
      return "IOS_PWA";
    }

    // 4. Android/Desktop PWA 판단 (deferredPrompt가 존재할 때만 표시)
    if (deferredPrompt) {
      return "OTHER_PWA";
    }

    return "NONE";
  }, [deferredPrompt]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // 클라이언트 마운트 및 deferredPrompt 갱신 시 상태 업데이트
    const nextState = determineDisplayState();
    setDisplayState(nextState);
  }, [determineDisplayState]);
  // endregion

  // region [Events]
  const renderAlarm = () => {
    switch (displayState) {
      case "DOMAIN":
        return <DomainNoticeDialog />;
      case "IOS_PWA":
        return <PWAInstallAlertIOSBottomSheet />;
      case "OTHER_PWA":
        return <PWAInstallAlertBottomSheet />;
      default:
        return null;
    }
  };
  // endregion

  return renderAlarm();
};

const MemoizedAlarmManager = memo(AlarmManager);
MemoizedAlarmManager.displayName = "AlarmManager";

export default MemoizedAlarmManager;