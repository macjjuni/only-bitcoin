import { SPACE_AVATAR_COLORS } from "../model/avatar";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_RANGE = 0x1_0000_0000;
/** 색이 스폰 각도·반지름과 상관되지 않도록 분리하는 시드. */
const COLOR_SEED = 0x85ebca6b;

/** FNV-1a 32비트 해시. 암호용이 아니라 결정적 분산용이다. */
export const hashClientKey = (clientKey: string, seed: number): number => {
  let hash = (FNV_OFFSET_BASIS ^ seed) >>> 0;

  for (let index = 0; index < clientKey.length; index += 1) {
    hash ^= clientKey.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

export const toUnitFraction = (hash: number): number => hash / UINT32_RANGE;

/**
 * `clientKey` 로부터 결정적인 아바타 색 인덱스를 만든다.
 *
 * 클라이언트와 `SpaceRoom` 이 **같은 함수**를 써야 한다. 서로 다른 시드로 뽑으면
 * 입장 직후 `welcome` 이 도착하는 순간 아바타 색이 바뀐다.
 */
export const resolveColorIndexFromClientKey = (clientKey: string): number => {
  return hashClientKey(clientKey, COLOR_SEED) % SPACE_AVATAR_COLORS.length;
};
