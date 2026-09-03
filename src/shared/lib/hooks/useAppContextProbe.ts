"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { useEffect } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import { detectBrowserContext, detectDisplayMode } from "@/shared/utils/device";

/** 세션당 1회만 발사하기 위한 키. 세션 수 = 실행 횟수가 되도록 맞춤. */
const PROBE_SESSION_KEY = "ob:app-context-sent";

/** `beforeinstallprompt` 는 로드 직후 비동기로 뜨므로, 성급히 쏘면 전부 none 으로 찍힘. */
const PROBE_DELAY_MS = 3000;

/**
 * 실행 환경(설치 실행 / 인앱 브라우저 / 설치 가능 여부)을 GA4 에 1회 전송함.
 * PWA 설치 게이트를 걸어도 되는지 판단할 모수를 모으는 용도.
 */
export default function useAppContextProbe() {
  // region [Privates]
  const isAlreadySent = () => {
    try {
      return sessionStorage.getItem(PROBE_SESSION_KEY) !== null;
    } catch {
      return false; // 시크릿 모드 등 스토리지 차단 환경은 그냥 매번 보냄
    }
  };

  const markAsSent = () => {
    try {
      sessionStorage.setItem(PROBE_SESSION_KEY, "1");
    } catch {
      // 저장 실패는 무시
    }
  };
  // endregion

  // region [Transactions]
  const sendAppContext = () => {
    // 프롬프트는 렌더 시점이 아니라 발사 시점 값을 읽어야 정확함.
    const { deferredPrompt } = useSettingStore.getState().setting;

    sendGAEvent("event", "app_context", {
      display_mode: detectDisplayMode(),
      browser_context: detectBrowserContext(),
      install_prompt: deferredPrompt ? "available" : "none",
    });

    markAsSent();
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (isAlreadySent()) return;

    const timer = setTimeout(sendAppContext, PROBE_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);
  // endregion
}
