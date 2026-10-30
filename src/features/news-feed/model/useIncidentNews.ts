"use client";

import { useMemo } from "react";
import { incidentEvents, useIncidentSeenStore } from "@/entities/incident";
import { useMounted } from "@/shared/lib/hooks";
import { findLatestUnseenIncident } from "../lib/findLatestUnseenIncident";
import type { NewsItem } from "./types";

const INCIDENTS_PATH = "/incidents";

/**
 * 거래소 사고 연표에서 아직 안 본 최신 사건을 소식으로 바꿔 돌려줌.
 *
 * 확인 기록은 `/incidents` 진입 시 남는 걸 그대로 씀. 서버 렌더링 땐 기록을 몰라서 마운트 전엔 `null`.
 */
export function useIncidentNews(): NewsItem | null {
  //#region [Hooks]
  const isMounted = useMounted();
  const seenIncidentIDs = useIncidentSeenStore((state) => state.seenIncidentIDs);

  const latestUnseenIncident = useMemo(
    () => findLatestUnseenIncident(incidentEvents, seenIncidentIDs),
    [seenIncidentIDs],
  );
  //#endregion

  if (!isMounted || !latestUnseenIncident) {
    return null;
  }

  return {
    id: `incident:${latestUnseenIncident.id}`,
    label: "거래소 사고",
    title: `${latestUnseenIncident.name} · ${latestUnseenIncident.summary}`,
    href: INCIDENTS_PATH,
  };
}
