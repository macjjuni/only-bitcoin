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

/** 패널은 16:9 다. 텍스처(1600 × 900) 와 비율이 어긋나면 글자가 늘어난다. */
export const SPACE_BILLBOARD = {
  width: 9.6,
  height: 5.4,
  position: [0, BILLBOARD_CENTER_Y, SPACE_WALL_Z] as const,
  frameWidth: 10.2,
  frameHeight: 6,
  framePosition: [0, BILLBOARD_CENTER_Y, SPACE_WALL_Z - 0.1] as const,
  /**
   * 바닥을 물들이는 광원 위치.
   *
   * 패널을 따라 올리면 바닥까지의 거리가 멀어져(감쇠 제곱) 오렌지 반사가 절반
   * 아래로 떨어진다. 패널 자체는 발광 재질이라 광원과 분리해도 밝기가 유지되므로
   * 광원만 낮게 고정한다.
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
  position: readonly [number, number, number];
  /** Y축 회전(라디안). 안쪽으로 15° 틀어 스폰 링 어디서든 한 화면에 잡히게 함. */
  rotationY: number;
}

const AD_BOARD_TILT = (15 * Math.PI) / 180;

export const SPACE_AD_BOARDS: readonly SpaceAdBoardPlacement[] = [
  {
    id: "left",
    width: 6,
    height: 4,
    position: [-11, 3.2, SPACE_WALL_Z + 0.6],
    rotationY: AD_BOARD_TILT,
  },
  {
    id: "right",
    width: 6,
    height: 4,
    position: [11, 3.2, SPACE_WALL_Z + 0.6],
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
