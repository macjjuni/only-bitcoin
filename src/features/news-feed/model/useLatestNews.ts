"use client";

import type { NewsItem } from "./types";
import { useAnnouncementNews } from "./useAnnouncementNews";
import { useIncidentNews } from "./useIncidentNews";

/**
 * 플로팅 소식지에 띄울 소식 한 건을 고름.
 *
 * **서비스 공지가 사고 연표보다 앞선다.** 공지는 노출 기간이 짧아 그 기간에만
 * 자리를 차지하고, 사고 소식은 확인 기록이 남을 때까지 계속 기다릴 수 있다.
 */
export function useLatestNews(): NewsItem | null {
  //#region [Hooks]
  const announcementNews = useAnnouncementNews();
  const incidentNews = useIncidentNews();
  //#endregion

  return announcementNews ?? incidentNews;
}
