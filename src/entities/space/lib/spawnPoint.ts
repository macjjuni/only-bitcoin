import type { PlayerTransform } from "@/entities/space/model/playerState";
import { SPACE_SPAWN_FACING, SPACE_SPAWN_RING } from "@/entities/space/model/spaceWorld";
import { hashClientKey, toUnitFraction } from "./clientKeyHash";

/** 각도와 반지름이 같은 해시에서 나와 상관되지 않도록 분리하는 시드. */
const RADIUS_SEED = 0x9e3779b9;

// region [Privates]
/**
 * 링 안에서 면적 기준으로 균일한 반지름을 뽑는다.
 *
 * 분수를 반지름에 그대로 곱하면 안쪽 둘레에 사람이 몰린다. 면적이 반지름의
 * 제곱에 비례하므로 제곱 공간에서 보간한 뒤 제곱근을 취한다.
 */
const toRingRadius = (fraction: number): number => {
  const { minRadius, maxRadius } = SPACE_SPAWN_RING;
  const innerArea = minRadius * minRadius;
  const outerArea = maxRadius * maxRadius;

  return Math.sqrt(innerArea + fraction * (outerArea - innerArea));
};

/**
 * 궁전을 바라보는 yaw.
 *
 * 아바타의 기본 전방은 `-Z` 이므로, Y축 회전 θ 의 전방 벡터는 `(-sinθ, 0, -cosθ)` 다.
 * 목표 방향 `(dx, dz)` 와 맞추면 `θ = atan2(-dx, -dz)` 가 된다.
 */
const toPalaceFacingYaw = (x: number, z: number): number => {
  const [palaceX, , palaceZ] = SPACE_SPAWN_FACING;

  return Math.atan2(-(palaceX - x), -(palaceZ - z));
};
// endregion

/**
 * `clientKey` 로부터 결정적인 스폰 좌표를 만든다.
 *
 * 같은 키는 항상 같은 자리로 돌아오므로 재접속 시 위치가 튀지 않는다.
 *
 * **지형을 묻지 않는다.** 서버도 같은 함수로 좌석 좌표를 만드는데 서버에는
 * 충돌 메시가 없다. 그래서 링을 광장 한가운데(소품이 없는 것이 확실한 반지름
 * 9 m 안)로 묶고 `y` 를 광장 바닥 높이로 고정한다 — 벙커 시절처럼 스폰 뒤에
 * 소품 밖으로 밀어내는 보정이 필요 없다.
 */
export const createSpawnPoint = (clientKey: string): PlayerTransform => {
  const { centerX, centerZ, y, arcCenterAngle, arcHalfSpan } = SPACE_SPAWN_RING;
  // 온전한 원이 아니라 궁전 쪽 반원이다. 이유는 `SPACE_SPAWN_RING` 참고 —
  // 카메라가 플레이어 뒤 +Z 로 물러나므로 +Z 쪽 스폰은 첫 화면이 나무에 가린다.
  const arcFraction = toUnitFraction(hashClientKey(clientKey, 0)) * 2 - 1;
  const angle = arcCenterAngle + arcFraction * arcHalfSpan;
  const radius = toRingRadius(toUnitFraction(hashClientKey(clientKey, RADIUS_SEED)));
  const x = centerX + Math.cos(angle) * radius;
  const z = centerZ + Math.sin(angle) * radius;

  return { x, y, z, yaw: toPalaceFacingYaw(x, z) };
};
