/**
 * 월드 치수와 배치 상수.
 *
 * 맵은 `public/models/bitcoin_hall_draco.glb`(비트코인 홀, 실내 카페 + 눈 안뜰)임. 좌표는
 * 그 GLB 에서 읽은 값에 `SPACE_HALL.mapOffsetY` 만큼 올린 것이고,
 * `spaceWorld.test.ts` 가 GLB 를 직접 열어 어긋나지 않는지 고정함.
 *
 * 1 unit = 1 m. 전광판 벽이 −Z, 출입문이 +Z, 벽난로·커피 바가 −X 쪽임.
 * 안뜰은 +X 외벽 너머(x 21…51)에 붙어 있고 발코니 출구로 나감.
 */

/** 동시 접속 상한. `InstancedMesh` 슬롯 수와 서버 좌석 수가 이 값을 따른다. */
export const SPACE_MAX_OCCUPANTS = 50;

/**
 * 홀의 층 높이.
 *
 * GLB 는 홀 바닥이 y=0, 가운데 선큰 라운지가 y=−1 임. 스냅샷·서버가 `y ≥ 0` 만
 * 받으므로 맵 전체를 1.5 m 올려서 씀. 1 m 만 올리면 라운지 바닥이 정확히 0 이라
 * Draco 양자화 오차로 음수가 섞임.
 */
export const SPACE_HALL = {
  /** GLB 좌표에 더하는 높이. 씬·충돌·앵커 전부 같은 값으로 올림. */
  mapOffsetY: 1.5,
  /** 선큰 라운지 바닥. */
  loungeY: 0.5,
  /** 홀 바닥. 스폰 높이임. */
  floorY: 1.5,
  /** 이보다 내려가면 맵 밖으로 빠진 것으로 보고 스폰으로 되돌림. */
  fallResetY: 0,
} as const;

/**
 * 좌표로 허용하는 최대 높이(m).
 *
 * 서버 위생 검사용 느슨한 상한임. 충돌 메시 꼭대기(GLB 18.8 m + 1.5)에 점프
 * 정점과 여유를 더했음. 꼭대기는 안뜰 틈을 막는 담이라 올라설 수는 없음.
 * 스냅샷은 1 cm 정밀도 2바이트로 담음.
 */
export const SPACE_MAX_ALTITUDE = 23;

/**
 * 이동 가능 영역의 바깥 상자.
 *
 * 충돌 메시 범위(x −21…51, z −24…20)와 같음. 홀이 x ±21 이고 그 너머 51 까지가
 * 안뜰임. 실제 경계는 벽 충돌이 만들고, 이 값은 서버 검증과 레이캐스트가
 * 비었을 때의 마지막 가드임.
 */
export const SPACE_BOUNDS = {
  minX: -21,
  maxX: 51,
  minZ: -24,
  maxZ: 20,
} as const;

/**
 * 카메라가 들어갈 수 있는 범위.
 *
 * 벽 밖으로 나가면 바깥 허공이 비침. 바깥 상자 안쪽으로 0.5 m 들이고,
 * 홀 천장(GLB 28.5 m + 1.5) 아래로 묶었음. 안뜰은 하늘이 열려 있지만 같은 높이를 씀.
 * 벽에 파고드는 것은 지형 레이캐스트가 막음.
 */
export const SPACE_CAMERA_BOUNDS = {
  minX: SPACE_BOUNDS.minX + 0.5,
  maxX: SPACE_BOUNDS.maxX - 0.5,
  minZ: SPACE_BOUNDS.minZ + 0.5,
  maxZ: SPACE_BOUNDS.maxZ - 0.5,
  maxY: 28,
} as const;

/**
 * 스폰 고리. 가운데 선큰 라운지의 테이블과 둘레 소파 사이 바닥임.
 *
 * 서버도 같은 함수로 좌석 좌표를 만들고 지형을 모르므로, 소품이 없는 것이
 * 확실한 범위로 묶었음. 라운지는 (0, 1.75) 중심 반지름 약 7 m 이고 가운데
 * 원형 테이블이 반지름 약 2.3 m 를 차지함. 충돌 메시로 6,000점 재 보니
 * 반지름 3.2~5.6 m 고리는 전부 라운지 바닥(GLB y = −1)이 평평하고, 몸통 높이에서
 * 가장 가까운 물체까지 0.57 m 떨어져 있음.
 */
export const SPACE_SPAWN_RING = {
  centerX: 0,
  centerZ: 1.75,
  /** 라운지 바닥 높이. 스폰 좌표의 `y` 가 됨. */
  y: SPACE_HALL.loungeY,
  minRadius: 3.2,
  maxRadius: 5.6,
  /** `x = r·cos(a)`, `z = r·sin(a)` 기준. 반폭 π 라 온전한 원임. */
  arcCenterAngle: -Math.PI / 2,
  arcHalfSpan: Math.PI,
} as const;

/** 메인 전광판 표시 영역. GLB `Screen_Anchor`(28 × 10.5, +Z 방향)와 같음. */
export const SPACE_SCREEN_FRAME = {
  width: 28,
  height: 10.5,
  /** 앵커 중심. 벽면에서 5 cm 띄웠음. */
  position: [0, 8.25 + SPACE_HALL.mapOffsetY, -23.96 + 0.05] as const,
  rotationY: 0,
} as const;

/** 커피 바 메뉴판 자리. GLB `Menu_Anchor`(6 × 2.5, −Z 방향)와 같음. */
export const SPACE_MENU_FRAME = {
  width: 6,
  height: 2.5,
  position: [-14.5, 6.75 + SPACE_HALL.mapOffsetY, 19.96 - 0.05] as const,
  rotationY: Math.PI,
} as const;

/** 스폰했을 때 바라보는 지점. 메인 전광판 중심임. */
export const SPACE_SPAWN_FACING = SPACE_SCREEN_FRAME.position;

/**
 * 전광판 한 칸의 설계 치수. 4:3 이고 텍스처(1600 × 1200)와 같은 비율임.
 *
 * 메인 액자(28 × 10.5)를 좌우 두 칸(각 14 × 10.5)으로 나눠 왼쪽에 시세,
 * 오른쪽에 네트워크 현황을 둠. 설계 치수는 텍스처 200 px 당 1 m 로 잡았음.
 */
export const SPACE_BILLBOARD = {
  width: 8,
  height: 6,
  /** 가격 숫자 크기 기준 거리. 라운지 건너편에서 보는 거리임. */
  referenceViewDistance: 24,
} as const;

/** 네트워크 현황판. 전광판과 같은 규격을 씀. */
export const SPACE_BLOCK_DASHBOARD = {
  width: SPACE_BILLBOARD.width,
  height: SPACE_BILLBOARD.height,
} as const;

/** 메인 액자를 반으로 나눈 한 칸. */
export const SPACE_SCREEN_HALF = {
  width: SPACE_SCREEN_FRAME.width / 2,
  height: SPACE_SCREEN_FRAME.height,
} as const;

/** 비율을 지킨 채 액자 안에 들어가는 최대 배율. */
const fitScale = (frame: { width: number; height: number }): number =>
  Math.min(frame.width / SPACE_BILLBOARD.width, frame.height / SPACE_BILLBOARD.height);

/** 전광판 한 칸을 액자 반쪽에 맞추는 배율. 4:3 끼리라 빈틈 없이 꽉 참(1.75). */
export const SPACE_SCREEN_SCALE = fitScale(SPACE_SCREEN_HALF);

/** 액자 중심에서 반쪽 칸 중심까지 거리(x). */
const SCREEN_HALF_OFFSET_X = SPACE_SCREEN_HALF.width / 2;

/** 패널 월드 배치. 메인 액자 왼쪽 칸에 시세, 오른쪽 칸에 네트워크 현황을 둠. */
export const SPACE_SCREEN_PLACEMENTS = {
  billboard: {
    position: [
      SPACE_SCREEN_FRAME.position[0] - SCREEN_HALF_OFFSET_X,
      SPACE_SCREEN_FRAME.position[1],
      SPACE_SCREEN_FRAME.position[2],
    ] as const,
    rotationY: SPACE_SCREEN_FRAME.rotationY,
    scale: SPACE_SCREEN_SCALE,
  },
  blockDashboard: {
    position: [
      SPACE_SCREEN_FRAME.position[0] + SCREEN_HALF_OFFSET_X,
      SPACE_SCREEN_FRAME.position[1],
      SPACE_SCREEN_FRAME.position[2],
    ] as const,
    rotationY: SPACE_SCREEN_FRAME.rotationY,
    scale: SPACE_SCREEN_SCALE,
  },
} as const;

/**
 * 메인 액자 위 티커 테이프 자리. GLB `Ticker_Anchor`(28 × 2, +Z 방향)와 같음.
 *
 * 액자와 같은 벽이라 5 cm 앞으로 띄움. 흐르는 한 바퀴의 길이·속도는 텍스처를
 * 굽는 쪽(`tickerTexture`)이 가짐 — 칸 수가 바뀌면 같이 바뀌는 값이라서임.
 */
export const SPACE_TICKER_FRAME = {
  width: SPACE_SCREEN_FRAME.width,
  height: 2,
  position: [0, 15.5 + SPACE_HALL.mapOffsetY, -23.96 + 0.05] as const,
  rotationY: 0,
} as const;

/**
 * 전광판이 아바타를 물들이는 광원 위치.
 *
 * 홀은 라이트맵으로 구워져 실시간 광원을 받지 않음. 이 광원은 전광판 앞에 선
 * 아바타에만 오렌지 기운을 줌.
 */
export const SPACE_SCREEN_GLOW_POSITIONS = [
  [0, SPACE_HALL.floorY + 3, -19],
] as const satisfies readonly (readonly [number, number, number])[];

/** 명찰·말풍선 표시 상한. 인원 비례가 아니라 DOM 렌더 비용의 상한이다. */
export const SPACE_OVERLAY_LIMITS = {
  /**
   * 명찰 표시 거리. 맵 대각선이라 사실상 제한 없음.
   *
   * DOM 비용은 `nameplateMaxCount` 가 정함. 가까운 순으로 16개만 그림.
   */
  nameplateMaxDistance: Math.hypot(
    SPACE_BOUNDS.maxX - SPACE_BOUNDS.minX,
    SPACE_BOUNDS.maxZ - SPACE_BOUNDS.minZ,
  ),
  nameplateMaxCount: 16,
  bubbleMaxCount: 12,
  bubbleTtlMs: 5_000,
} as const;

/** 벽난로 쪽 추가 화면. GLB `Fireplace_Screen_Anchor`의 2:1 표시 영역. */
export const SPACE_HEATMAP_FRAME = {
  width: 13,
  height: 6.5,
  /** 유리와 겹치지 않도록 앵커에서 실내(+X) 방향으로 2 cm 띄움. */
  position: [-18.57 + 0.02, 9.2 + SPACE_HALL.mapOffsetY, 4] as const,
  rotationY: Math.PI / 2,
} as const;
