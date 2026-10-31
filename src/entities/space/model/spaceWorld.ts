/**
 * 월드 치수와 배치 상수.
 *
 * 값의 근거는 `docs/btc-space-3d.md` §4 에 있다. 밀도(33.3 m²/인)를 기준으로
 * 역산한 값이므로 동시 접속 상한을 바꾸면 경계도 함께 다시 계산해야 한다.
 */

/** 동시 접속 상한. `InstancedMesh` 슬롯 수와 서버 좌석 수가 이 값을 따른다. */
export const SPACE_MAX_OCCUPANTS = 50;

/** 전광판·광고판이 붙는 뒷벽의 z 좌표. */
export const SPACE_WALL_Z = -18;

export const SPACE_GROUND = {
  width: 64,
  depth: 48,
  /** 뒷벽과 이동 경계를 모두 덮도록 중심을 뒤로 당김. */
  centerZ: -2,
} as const;

/** 이동 가능 영역. 가용 52 × 32 = 1,664 m². */
export const SPACE_BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -16,
  maxZ: 16,
} as const;

/**
 * 스폰 링. 단일 지점이 아니라 링 안에 분산한다.
 * 50명이 같은 좌표에서 시작하면 아바타가 완전히 겹친다.
 */
export const SPACE_SPAWN_RING = {
  centerX: 0,
  centerZ: 0,
  minRadius: 5,
  maxRadius: 14,
} as const;

/**
 * 전광판 중심 높이.
 *
 * 벽에 가장 가까이 붙은 경우(벽까지 8 m)의 가시 상단이 9.8 m 다. 현재 프레임
 * 상단은 9.0 m 라 0.8 m 여유가 있다. 패널을 키우면 이 여유부터 줄어든다.
 */
const BILLBOARD_CENTER_Y = 6;

/**
 * 전광판·광고판이 매달리는 기준점.
 *
 * 좁은 화면에서 이 점을 중심으로 전체를 축소한다. 패널 좌표를 절대값으로 두면
 * 축소할 때 벽에서 떨어져 나오고 높이도 같이 내려간다.
 */
export const SPACE_WALL_ANCHOR = [0, BILLBOARD_CENTER_Y, SPACE_WALL_Z] as const;

/** 패널은 16:9 다. 텍스처(1600 × 900) 와 비율이 어긋나면 글자가 늘어난다. */
export const SPACE_BILLBOARD = {
  width: 9.6,
  height: 5.4,
  /** `SPACE_WALL_ANCHOR` 기준 상대 위치. */
  offset: [0, 0, 0] as const,
  frameWidth: 10.2,
  frameHeight: 6,
  frameOffset: [0, 0, -0.1] as const,
  /**
   * 바닥을 물들이는 광원 위치. 축소 그룹 **바깥**의 절대 좌표다.
   *
   * 패널을 따라 올리면 바닥까지의 거리가 멀어져(감쇠 제곱) 오렌지 반사가 절반
   * 아래로 떨어진다. 패널 자체는 발광 재질이라 광원과 분리해도 밝기가 유지되므로
   * 광원만 낮게 고정한다. 화면이 좁다고 조명까지 줄일 이유도 없다.
   */
  glowPosition: [0, 4, SPACE_WALL_Z + 2.5] as const,
  /** 가격 숫자 크기 기준 거리. 스폰 링 먼 쪽 끝. */
  referenceViewDistance: 32,
} as const;

export type SpaceAdBoardId = "left" | "right";

export interface SpaceAdBoardPlacement {
  id: SpaceAdBoardId;
  width: number;
  height: number;
  /** `SPACE_WALL_ANCHOR` 기준 상대 위치. */
  offset: readonly [number, number, number];
  /** Y축 회전(라디안). 안쪽으로 15° 틀어 스폰 링 어디서든 한 화면에 잡히게 함. */
  rotationY: number;
}

const AD_BOARD_TILT = (15 * Math.PI) / 180;

/**
 * 전광판 중심에서 광고판 중심까지의 거리.
 *
 * 15° 기울어 있어 가로 투영 반폭이 2.90 이므로 안쪽 끝은 7.00 이고, 전광판
 * 프레임 끝(5.10)과 1.90 m 떨어진다.
 */
const AD_BOARD_OFFSET_X = 9.9;

/**
 * 광고판은 전광판과 세로 중심을 맞춘다.
 *
 * 두 판의 높이가 다르므로(5.4 vs 4) 아래를 맞추면 윗변이 어긋나고 위를 맞추면
 * 아랫변이 어긋난다. 중심을 맞춰야 세 판이 한 줄로 읽힌다. 시선 위계는 높이가
 * 아니라 크기 차이로 준다.
 */
export const SPACE_AD_BOARDS: readonly SpaceAdBoardPlacement[] = [
  {
    id: "left",
    width: 6,
    height: 4,
    offset: [-AD_BOARD_OFFSET_X, 0, 0.6],
    rotationY: AD_BOARD_TILT,
  },
  {
    id: "right",
    width: 6,
    height: 4,
    offset: [AD_BOARD_OFFSET_X, 0, 0.6],
    rotationY: -AD_BOARD_TILT,
  },
] as const;

/** 명찰·말풍선 표시 상한. 인원 비례가 아니라 DOM 렌더 비용의 상한이다. */
export const SPACE_OVERLAY_LIMITS = {
  nameplateMaxDistance: 25,
  nameplateMaxCount: 16,
  bubbleMaxCount: 12,
  bubbleTtlMs: 5_000,
} as const;
