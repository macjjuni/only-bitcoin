import type { PlayerTransform } from "@/entities/space/model/playerState";
import {
  SPACE_BOUNDS,
  SPACE_SPAWN_RING,
  SPACE_WALL_ANCHOR,
} from "@/entities/space/model/spaceWorld";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
/** 각도와 반지름이 같은 해시에서 나와 상관되지 않도록 분리하는 시드. */
const RADIUS_SEED = 0x9e3779b9;
const UINT32_RANGE = 0x1_0000_0000;

// region [Privates]
/** FNV-1a 32비트 해시. 암호용이 아니라 결정적 분산용이다. */
const hashString = (value: string, seed: number): number => {
  let hash = (FNV_OFFSET_BASIS ^ seed) >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

const toUnitFraction = (hash: number): number => hash / UINT32_RANGE;

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
 * 전광판 중심을 바라보는 yaw.
 *
 * 아바타의 기본 전방은 `-Z` 이므로, Y축 회전 θ 의 전방 벡터는 `(-sinθ, 0, -cosθ)` 다.
 * 목표 방향 `(dx, dz)` 와 맞추면 `θ = atan2(-dx, -dz)` 가 된다.
 */
const toBillboardFacingYaw = (x: number, z: number): number => {
  const [billboardX, , billboardZ] = SPACE_WALL_ANCHOR;

  return Math.atan2(-(billboardX - x), -(billboardZ - z));
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
// endregion

/**
 * `clientKey` 로부터 결정적인 스폰 좌표를 만든다.
 *
 * 같은 키는 항상 같은 자리로 돌아오므로 재접속 시 위치가 튀지 않는다.
 */
export const createSpawnPoint = (clientKey: string): PlayerTransform => {
  const { centerX, centerZ } = SPACE_SPAWN_RING;
  const angle = toUnitFraction(hashString(clientKey, 0)) * Math.PI * 2;
  const radius = toRingRadius(toUnitFraction(hashString(clientKey, RADIUS_SEED)));
  const x = clamp(centerX + Math.cos(angle) * radius, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX);
  const z = clamp(centerZ + Math.sin(angle) * radius, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ);

  return { x, z, yaw: toBillboardFacingYaw(x, z) };
};
