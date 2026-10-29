import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INCIDENT_SEEN_PERSIST_KEY } from "@/shared/stores/persistKeys";

interface IncidentSeenState {
  /** 사용자가 `/incidents` 에서 마지막으로 확인한 사건 id 목록. */
  seenIncidentIDs: string[];
  markIncidentsSeen: (incidentIDs: readonly string[]) => void;
}

export const useIncidentSeenStore = create<IncidentSeenState>()(
  persist(
    (set) => ({
      seenIncidentIDs: [],
      markIncidentsSeen: (incidentIDs) => set(() => ({ seenIncidentIDs: [...incidentIDs] })),
    }),
    { name: INCIDENT_SEEN_PERSIST_KEY },
  ),
);
