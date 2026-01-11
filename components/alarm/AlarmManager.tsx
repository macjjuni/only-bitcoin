"use client";

import React, { memo, useEffect, useState } from "react";
import {
  DomainNoticeDialog,
  PWAInstallAlertBottomSheet,
  PWAInstallAlertIOSBottomSheet,
} from "@/components";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { getCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY, PWA_COOKIE_KEY } from "@/shared/constants/setting";
import { isIOSPWA, isIOSSafari } from "@/shared/utils/device";



const AlarmManager = () => {
  // region [Hooks]
  const { deferredPrompt } = useInitializePWA();
  const [mounted, setMounted] = useState(false);
  // endregion

  // region [Privates]
  const getDisplayStates = () => {
    // 클라이언트 에서만 렌더링 (하이드레이션 방지)
    if (typeof window === "undefined" || !mounted) {
      return { showDomain: false, showInstallAlarmIOS: false, showInstallAlarmOther: false };
    }

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

  // region [Life Cycles]
  useEffect(() => {
    setMounted(true);
  }, []);
  // endregion

  // 마운트 전에는 서버와 동일하게 null 반환
  if (!mounted) return null;

  return <>{renderAlarm()}</>;
};

const MemoizedAlarmManager = memo(AlarmManager);
MemoizedAlarmManager.displayName = "AlarmManager";

export default MemoizedAlarmManager;