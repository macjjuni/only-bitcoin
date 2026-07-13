"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { useEffect } from "react";
import {
  DEFAULT_INITIAL_PATH,
  INITIAL_PATH_COOKIE_KEY,
  INITIAL_PATH_COOKIE_MAX_AGE_DAYS,
} from "@/shared/constants/setting";
import useSettingStore from "@/shared/stores/settingStore";
import { getCookie, setCookie } from "@/shared/utils/cookie";

/**
 * 루트(`/`) 진입 리다이렉트는 서버(`src/app/page.tsx`)가 쿠키 기반으로 처리한다.
 * 이 훅은 Zustand 설정의 시작 페이지 값을 쿠키와 동기화한다.
 * - 설정 변경 시 쿠키 갱신
 * - 최초 방문 또는 쿠키 삭제 시 로컬 스토리지 설정값으로 쿠키 복구
 */
export default function useInitializePage() {
  // region [Hooks]
  const pathname = usePathname();
  const router = useTransitionRouter();
  const searchParams = useSearchParams();
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (getCookie(INITIAL_PATH_COOKIE_KEY) === initialPath) {
      return;
    }

    // TODO: 삭제 예정 — 쿠키 도입(2026-07) 이전 사용자 이행용 폴백. 배포 후 충분한 기간이 지나면 제거.
    // 쿠키가 없던 기존 사용자는 서버가 기본 페이지로 보내므로,
    // 로컬 스토리지에 저장된 시작 페이지로 1회 재이동시킨다.
    const isLegacyUserOnDefaultPage =
      getCookie(INITIAL_PATH_COOKIE_KEY) === null &&
      pathname === DEFAULT_INITIAL_PATH &&
      initialPath !== DEFAULT_INITIAL_PATH;

    setCookie(INITIAL_PATH_COOKIE_KEY, initialPath, INITIAL_PATH_COOKIE_MAX_AGE_DAYS);

    if (isLegacyUserOnDefaultPage) {
      const queryString = searchParams.toString();
      router.replace(queryString ? `${initialPath}?${queryString}` : initialPath);
    }
  }, [pathname, router, searchParams, initialPath]);
  // endregion
}
