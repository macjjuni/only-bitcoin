"use client";

import React, { memo, useMemo } from "react";
import { DomainNoticeDialog, PWAInstallAlertBottomSheet, PWAInstallAlertIOSBottomSheet } from "@/components";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { getCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY, PWA_COOKIE_KEY } from "@/shared/constants/setting";
import { isIOSPWA, isIOSSafari } from "@/shared/utils/device";

const AlarmManager = () => {
  // region [Hooks]
  const { deferredPrompt } = useInitializePWA();
  // endregion

  // region [Privates]
  const displayState = useMemo(() => {
    // 1. 도메인 이전 공지 판단
    const isHideDomain = !!getCookie(NOTICE_COOKIE_KEY);
    const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const isRedirected = searchParams.get("redirected") === "true";

    if (!isHideDomain && isRedirected) {
      return "DOMAIN";
    }

    // 2. 공통 쿠키 확인 (오늘 하루 안보기)
    const isHidePWA = !!getCookie(PWA_COOKIE_KEY);
    if (isHidePWA) return "NONE";

    // 3. IOS PWA 판단
    if (isIOSSafari() && !isIOSPWA()) {
      return "IOS_PWA";
    }

    // 4. Android/Desktop PWA 판단 (deferredPrompt 존재 여부 확인)
    if (deferredPrompt) {
      return "OTHER_PWA";
    }

    return "NONE";
  }, [deferredPrompt]);

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