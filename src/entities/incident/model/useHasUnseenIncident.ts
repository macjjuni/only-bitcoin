"use client";

import { useMounted } from "@/shared/lib/hooks";
import { hasUnseenIncident } from "../lib/hasUnseenIncident";
import { useIncidentSeenStore } from "./incidentSeenStore";
import { incidentIDs } from "./incidents";

/**
 * 아직 확인하지 않은 거래소 사고가 있는지 돌려줌.
 *
 * 서버 렌더링 땐 확인 목록을 몰라서 마운트 전엔 항상 `false` 로 둠. 하이드레이션 불일치 막으려고 씀.
 */
export function useHasUnseenIncident(): boolean {
  // region [Hooks]
  const isMounted = useMounted();
  const seenIncidentIDs = useIncidentSeenStore((state) => state.seenIncidentIDs);
  // endregion

  if (!isMounted) {
    return false;
  }

  return hasUnseenIncident(incidentIDs, seenIncidentIDs);
}
