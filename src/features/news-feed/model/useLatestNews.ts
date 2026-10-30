"use client";

import type { NewsItem } from "./types";
import { useIncidentNews } from "./useIncidentNews";

/**
 * 플로팅 소식지에 띄울 소식 한 건을 고름.
 *
 * 지금은 사고 연표만 씀. 출처가 늘면 여기서 우선순위대로 골라 붙이면 됨.
 */
export function useLatestNews(): NewsItem | null {
  //#region [Hooks]
  const incidentNews = useIncidentNews();
  //#endregion

  return incidentNews;
}
