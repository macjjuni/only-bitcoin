"use client";

import type { NewsItem } from "./types";
import { useAnnouncementNews } from "./useAnnouncementNews";
import { useIncidentNews } from "./useIncidentNews";

/**
 * 플로팅 소식지에 띄울 소식 한 건을 고름.
 *
 * **거래소 사고가 서비스 공지보다 앞선다.** 사고는 이용자 자산과 바로 닿는 소식이라
 * 제일 먼저 보여줌. 공지는 안 본 사고가 없을 때만 자리를 차지하고, 기간이 지나면
 * 알아서 사라짐.
 */
export function useLatestNews(): NewsItem | null {
  //#region [Hooks]
  const incidentNews = useIncidentNews();
  const announcementNews = useAnnouncementNews();
  //#endregion

  return incidentNews ?? announcementNews;
}
