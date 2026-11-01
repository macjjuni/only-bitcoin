/** 아바타 치수와 색상 팔레트. 형상 자체는 `public/models/crew.glb` 가 가진다. */

/**
 * 모델 바깥에서 필요한 아바타 치수.
 *
 * 형상은 `public/models/crew.glb` 가 정한다. 여기에는 모델이 알려줄 수 없는 값만
 * 남긴다. 모델을 바꾸면 `headCenterY` 도 같이 바뀌므로
 * `scripts/blender/process-voxel-crew.py` 가 출력하는 `[anchor]` 값을 옮겨 적는다.
 */
export const SPACE_AVATAR = {
  /** 모델 전체 높이. 발바닥이 원점이라 아바타는 `(x, 0, z)` 에 둔다. */
  height: 1.81,
  /** 명찰·말풍선이 매달리는 머리 중심. 모델에서 측정한 값이다. */
  headCenterY: 1.484,
  /** 접지 그림자 블롭 반경. 실시간 그림자 맵 대신 사용. */
  shadowRadius: 0.45,
} as const;

/**
 * 아바타 색 팔레트.
 *
 * 비트코인 오렌지(`#F7931A`)는 전광판 전용이라 넣지 않는다. 어두운 바닥에서
 * 서로 구분되도록 명도를 높게 잡았다.
 */
export const SPACE_AVATAR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#818cf8",
  "#c084fc",
  "#f472b6",
  "#fda4af",
  "#e2e8f0",
] as const;

export type SpaceAvatarColor = (typeof SPACE_AVATAR_COLORS)[number];

/** 색 인덱스를 팔레트 범위로 접어 색을 돌려준다. 범위를 벗어난 값도 안전하게 처리한다. */
export const resolveAvatarColor = (colorIndex: number): SpaceAvatarColor => {
  const safeIndex = Math.abs(Math.trunc(colorIndex)) % SPACE_AVATAR_COLORS.length;
  return SPACE_AVATAR_COLORS[safeIndex];
};
