/**
 * 월드 치수와 배치 상수.
 *
 * 값의 근거는 `docs/btc-space-3d.md` §4 에 있다. 밀도(33.3 m²/인)를 기준으로
 * 역산한 값이므로 동시 접속 상한을 바꾸면 경계도 함께 다시 계산해야 한다.
 */

/** 동시 접속 상한. `InstancedMesh` 슬롯 수와 서버 좌석 수가 이 값을 따른다. */
export const SPACE_MAX_OCCUPANTS = 50;

/**
 * 점프가 닿을 수 있는 최대 높이(m).
 *
 * 서버가 이 값으로 들어온 좌표를 검증하고, 스냅샷은 1 cm 정밀도의 1바이트로
 * 담는다. 실제 정점(약 1.13 m)보다 여유를 두되 255 cm 를 넘기면 안 된다.
 */
export const SPACE_MAX_JUMP_HEIGHT = 2.5;

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
 * 벽면 기준점 높이.
 *
 * 전광판 프레임 윗변은 9.0 m, 그 위 텍스트 배너 윗변은 10.0 m 다. 손가락
 * 기기는 카메라가 최대 거리에서 시작해 세로 시야가 넓으므로, 스폰 링 어느
 * 지점에서도(벽까지 4~32 m) 배너까지 한 화면에 들어온다.
 */
const BILLBOARD_CENTER_Y = 6;

/**
 * 전광판·광고판이 매달리는 기준점.
 *
 * 좁은 화면에서 이 점을 중심으로 전체를 축소한다. 패널 좌표를 절대값으로 두면
 * 축소할 때 벽에서 떨어져 나오고 높이도 같이 내려간다.
 */
export const SPACE_WALL_ANCHOR = [0, BILLBOARD_CENTER_Y, SPACE_WALL_Z] as const;

/**
 * 두 패널 프레임 사이 간격.
 *
 * 전광판과 블록 현황판은 **중앙선을 기준으로 좌우 대칭**으로 걸린다. 한쪽을
 * 중앙에 두고 다른 쪽을 옆에 붙이면 벽 전체가 한쪽으로 쏠린다.
 */
const WALL_PANEL_GAP = 0.8;

/** 프레임 반폭 + 간격 반. 두 패널이 이 거리만큼 중앙선에서 벌어진다. */
const WALL_PANEL_OFFSET_X = 5.1 + WALL_PANEL_GAP / 2;

/** 패널은 16:9 다. 텍스처(1600 × 900) 와 비율이 어긋나면 글자가 늘어난다. */
export const SPACE_BILLBOARD = {
  width: 9.6,
  height: 5.4,
  /** `SPACE_WALL_ANCHOR` 기준 상대 위치. 중앙선 **왼쪽**에 걸린다. */
  offset: [-WALL_PANEL_OFFSET_X, 0, 0] as const,
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
  glowPosition: [-WALL_PANEL_OFFSET_X, 4, SPACE_WALL_Z + 2.5] as const,
  /** 가격 숫자 크기 기준 거리. 스폰 링 먼 쪽 끝. */
  referenceViewDistance: 32,
} as const;

/**
 * 전광판 오른쪽 블록 현황판.
 *
 * **전광판과 같은 치수·프레임**(9.6 × 5.4, 프레임 10.2 × 6)을 쓰고, 중앙선을
 * 기준으로 전광판과 좌우 대칭으로 걸린다. 같은 벽에 나란히 걸리는 형제라
 * 크기가 다르면 한쪽이 보조처럼 읽힌다.
 *
 * ```text
 *   [ 전광판 ]  [ 현황판 ]
 *             │ 중앙선 (x = 0)
 * ```
 *
 * **기울기를 두지 않는다.** 처음에는 두 판을 안쪽으로 15° 틀었는데, 기울어진
 * 면이 옆 패널과 장비함에 가려 글자가 잘려 보였다. 두 판이 중앙선 양옆에 모여
 * 있으면 스폰 링 어디서 봐도 정면에 들어오므로 틀 이유가 없다.
 */
export const SPACE_BLOCK_DASHBOARD = {
  width: SPACE_BILLBOARD.width,
  height: SPACE_BILLBOARD.height,
  frameWidth: SPACE_BILLBOARD.frameWidth,
  frameHeight: SPACE_BILLBOARD.frameHeight,
  /** `SPACE_WALL_ANCHOR` 기준 상대 위치. 중앙선 **오른쪽**에 걸린다. */
  offset: [WALL_PANEL_OFFSET_X, 0, 0] as const,
  /** 프레임은 표시 면보다 0.1 뒤에 둔다. 전광판과 같은 값이다. */
  frameOffset: SPACE_BILLBOARD.frameOffset,
  rotationY: 0,
  /**
   * 바닥을 물들이는 광원 위치. 전광판과 같은 높이·깊이의 절대 좌표다.
   *
   * 두 판이 같은 규격으로 나란히 걸렸는데 한쪽 바닥만 오렌지로 물들면 현황판이
   * 꺼진 간판처럼 보인다. 패널은 발광 재질이라 광원과 분리해도 밝기가 유지되므로
   * 전광판과 마찬가지로 **축소 그룹 바깥**에 낮게 고정한다.
   */
  glowPosition: [WALL_PANEL_OFFSET_X, 4, SPACE_WALL_Z + 2.5] as const,
} as const;

/**
 * 좌우 패널을 합친 가로 범위.
 *
 * 좁은 화면 축소 가드(§6.4)가 **두 판을 함께** 화면에 맞추는 기준이다. 전광판
 * 하나만 기준으로 삼으면 현황판 바깥쪽이 잘린다.
 */
export const SPACE_WALL_PANEL_SPAN = (WALL_PANEL_OFFSET_X + 5.1) * 2;

/**
 * 전광판 위에 얹는 텍스트 전용 광고 배너.
 *
 * 전광판 패널과 같은 폭을 쓰며, 높이 0.8 m 의 12:1 배너다.
 * 별도 프레임 메시를 두지 않는다. 높이가 0.8 m 뿐이라 테두리 메시를 더하면
 * 패널보다 테두리가 두꺼워 보인다. 테두리는 텍스처에 그린다.
 */
export const SPACE_TEXT_BANNER = {
  width: SPACE_BILLBOARD.width,
  height: 0.8,
  /**
   * 전광판 프레임 윗변(+3)에서 0.2 띄우고 배너 반높이(0.4)를 더한 값.
   * 가로는 전광판을 따라간다 — 전광판 위에 얹는 배너라 중앙선에 두면 떠 보인다.
   */
  offset: [SPACE_BILLBOARD.offset[0], 3.6, 0] as const,
} as const;

/** 명찰·말풍선 표시 상한. 인원 비례가 아니라 DOM 렌더 비용의 상한이다. */
export const SPACE_OVERLAY_LIMITS = {
  /**
   * 명찰 표시 거리.
   *
   * 25 m 로 뒀더니 **스폰 직후 서로 이름이 안 보이는 경우**가 생겼다. 스폰 링
   * 반지름이 최대 14 m 라 두 사람이 링 양쪽에 떨어지면 28 m 다. 각도차 150°
   * 부터 상한을 넘겨, 접속만 하고 가만히 있으면 상대 이름을 못 본다.
   *
   * DOM 비용을 정하는 것은 거리가 아니라 `nameplateMaxCount` 다. 가까운 순으로
   * 16개만 그리므로 거리를 늘려도 노드 수는 그대로다. 스폰 링 지름(28)에 여유를
   * 더해 36 m 로 둔다. 멀면 글자가 작아지지만 다가가거나 줌하면 커진다.
   */
  nameplateMaxDistance: 36,
  nameplateMaxCount: 16,
  bubbleMaxCount: 12,
  bubbleTtlMs: 5_000,
} as const;
