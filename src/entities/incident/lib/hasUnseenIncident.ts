/**
 * 아직 확인하지 않은 사건이 하나라도 있는지 판단함.
 *
 * id 단위로 비교해서 과거 날짜 사건을 늦게 추가해도 잡히고, 기존 사건 문구 정정은 무시됨.
 * 한 번도 확인한 적 없으면 확인 목록이 비어 있으므로 항상 `true`.
 */
export function hasUnseenIncident(
  currentIncidentIDs: readonly string[],
  seenIncidentIDs: readonly string[],
): boolean {
  const seenIncidentIDSet = new Set(seenIncidentIDs);

  return currentIncidentIDs.some((incidentID) => !seenIncidentIDSet.has(incidentID));
}
