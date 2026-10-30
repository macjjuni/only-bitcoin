import type { IncidentEvent } from "@/entities/incident";

/**
 * 아직 확인 안 한 사건 중 가장 최근 것을 돌려줌.
 *
 * `incidents` 는 발생 월 오름차순이라 뒤에서부터 찾음. 같은 월이면 나중에 추가한 쪽이 뒤에 있음.
 */
export function findLatestUnseenIncident(
  incidents: readonly IncidentEvent[],
  seenIncidentIDs: readonly string[],
): IncidentEvent | null {
  const seenIncidentIDSet = new Set(seenIncidentIDs);

  for (let incidentIndex = incidents.length - 1; incidentIndex >= 0; incidentIndex -= 1) {
    const incident = incidents[incidentIndex];

    if (!seenIncidentIDSet.has(incident.id)) {
      return incident;
    }
  }

  return null;
}
