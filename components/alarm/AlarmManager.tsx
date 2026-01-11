"use client";

import React, { memo } from "react";
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
  const getDisplayStates = () => {
    // 1. 도메인 이전 공지 판단 (최우선)
    const isHideDomain = !!getCookie(NOTICE_COOKIE_KEY);
    const searchParams = new URLSearchParams(window.location.search);
    const isRedirected = searchParams.get("redirected") === "true";
    const showDomain = !isHideDomain && isRedirected;

    if (showDomain) {
      return { showDomain: true, showInstallAlarmIOS: false, showInstallAlarmOther: false };
    }

    // 2. 공통 쿠키 확인 (오늘 하루 안보기)
    const isHidePWA = !!getCookie(PWA_COOKIE_KEY);
    if (isHidePWA) {
      return { showDomain: false, showInstallAlarmIOS: false, showInstallAlarmOther: false };
    }

    // 3. IOS PWA 판단
    const showInstallAlarmIOS = isIOSSafari() && !isIOSPWA();
    if (showInstallAlarmIOS) {
      return { showDomain: false, showInstallAlarmIOS: true, showInstallAlarmOther: false };
    }

    // 4. Android/Desktop PWA 판단
    const showInstallAlarmOther = !!deferredPrompt;
    return { showDomain: false, showInstallAlarmIOS: false, showInstallAlarmOther };
  };

  const renderAlarm = () => {
    const { showDomain, showInstallAlarmIOS, showInstallAlarmOther } = getDisplayStates();

    if (showDomain) return <DomainNoticeDialog />;
    if (showInstallAlarmIOS) return <PWAInstallAlertIOSBottomSheet />;
    if (showInstallAlarmOther) return <PWAInstallAlertBottomSheet />;

    return null;
  };
  // endregion


  return <>{renderAlarm()}</>;
};

const MemoizedAlarmManager = memo(AlarmManager);
MemoizedAlarmManager.displayName = "AlarmManager";

export default MemoizedAlarmManager;