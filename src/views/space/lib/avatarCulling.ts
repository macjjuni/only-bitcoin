/**
 * 오버레이 표시 대상 선별.
 *
 * 명찰과 말풍선은 `<Html>` DOM 이라 개수가 곧 레이아웃 비용이다. 접속자 전원에게
 * 달면 50명 기준으로 DOM 노드가 폭발하므로 거리와 개수로 잘라낸다.
 */

export interface CullablePosition {
  /** 좌석 인덱스. 거리가 같을 때 선별 순서를 고정하는 데 쓴다. */
  seat: number;
  x: number;
  z: number;
}

export interface CullOptions {
  maxDistance: number;
  maxCount: number;
}

/**
 * 원점에서 `maxDistance` 안에 있는 후보 중 가까운 순으로 `maxCount` 개를 고른다.
 *
 * 거리가 완전히 같은 경우 좌석 번호가 작은 쪽을 먼저 둔다. 정렬이 흔들리면
 * 명찰이 프레임마다 깜빡이므로 결정적 순서가 필요하다.
 */
export const selectNearestVisible = <T extends CullablePosition>(
  candidates: readonly T[],
  origin: { x: number; z: number },
  { maxDistance, maxCount }: CullOptions,
): T[] => {
  if (maxCount <= 0 || maxDistance <= 0) {
    return [];
  }

  const maxDistanceSquared = maxDistance * maxDistance;
  const withinRange: { candidate: T; distanceSquared: number }[] = [];

  for (const candidate of candidates) {
    const deltaX = candidate.x - origin.x;
    const deltaZ = candidate.z - origin.z;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    // 제곱 거리로 비교해 매 프레임 제곱근 계산을 피한다.
    if (distanceSquared <= maxDistanceSquared) {
      withinRange.push({ candidate, distanceSquared });
    }
  }

  withinRange.sort((left, right) => {
    if (left.distanceSquared !== right.distanceSquared) {
      return left.distanceSquared - right.distanceSquared;
    }

    return left.candidate.seat - right.candidate.seat;
  });

  return withinRange.slice(0, maxCount).map(({ candidate }) => candidate);
};
