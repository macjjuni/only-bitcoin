"use client";

import { useMemo } from "react";
import { useMounted } from "@/shared/lib/hooks";
import { findActiveAnnouncement, SERVICE_ANNOUNCEMENTS } from "./announcements";
import type { NewsItem } from "./types";

/**
 * 기간이 남은 서비스 공지를 소식으로 돌려줌.
 *
 * 기간 판정에 현재 시각을 쓰므로 서버 렌더 결과와 달라질 수 있다. 사고 소식과
 * 같이 마운트 전에는 `null` 을 돌려 하이드레이션 불일치를 피한다.
 */
export function useAnnouncementNews(): NewsItem | null {
  //#region [Hooks]
  const isMounted = useMounted();
  const activeAnnouncement = useMemo(
    () => findActiveAnnouncement(SERVICE_ANNOUNCEMENTS, Date.now()),
    [],
  );
  //#endregion

  return isMounted ? activeAnnouncement : null;
}
