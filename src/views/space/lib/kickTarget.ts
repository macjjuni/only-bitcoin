import { type PlayerTransform, type RemotePlayer, SPACE_KICK } from "@/entities/space";

/**
 * 찰 사람을 고름. 없으면 `null` 이라 허공에 참.
 *
 * 내 정면 쪽(`minFacingDot`)으로 `reachMeters` 안, 높이 차 `maxHeightGap` 안에서 가장
 * 가까운 사람. 원격 위치는 200 ms 늦게 보간한 값이라 서버는 더 넉넉한 거리로 다시 봄.
 */
export const selectKickTarget = (
  players: readonly RemotePlayer[],
  self: PlayerTransform,
): number | null => {
  // 전방은 -Z 기준이라 yaw θ 의 앞은 (-sinθ, -cosθ).
  const facingX = -Math.sin(self.yaw);
  const facingZ = -Math.cos(self.yaw);
  let nearestSeat: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const player of players) {
    const gapX = player.x - self.x;
    const gapZ = player.z - self.z;
    const distance = Math.hypot(gapX, gapZ);

    if (
      distance > SPACE_KICK.reachMeters ||
      Math.abs(player.y - self.y) > SPACE_KICK.maxHeightGap ||
      distance >= nearestDistance
    ) {
      continue;
    }
    // 거의 겹쳐 서 있으면 방향을 못 따지니 그냥 대상으로 봄.
    const facingDot = distance < 0.05 ? 1 : (gapX * facingX + gapZ * facingZ) / distance;

    if (facingDot >= SPACE_KICK.minFacingDot) {
      nearestSeat = player.seat;
      nearestDistance = distance;
    }
  }

  return nearestSeat;
};
