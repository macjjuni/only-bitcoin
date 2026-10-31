/** 아바타 형상과 색상 팔레트. 형상 치수는 성능 예산(1인 192 tri)의 근거다. */

/**
 * 아바타 프리미티브 치수.
 *
 * 몸통 캡슐 + 머리 구로 총 높이 약 1.81 m. 세그먼트 수를 낮게 고정해
 * 50명 인스턴싱 시 삼각형 예산(9.6k) 안에 들어오게 한다.
 */
export const SPACE_AVATAR = {
  bodyRadius: 0.32,
  /** 캡슐의 원통 구간 길이. 전체 높이는 length + radius × 2. */
  bodyLength: 0.76,
  bodyCenterY: 0.7,
  bodyCapSegments: 4,
  bodyRadialSegments: 8,
  headRadius: 0.26,
  headCenterY: 1.55,
  headWidthSegments: 8,
  headHeightSegments: 6,
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
