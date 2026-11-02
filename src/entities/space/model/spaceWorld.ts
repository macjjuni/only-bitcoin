/**
 * 월드 치수와 배치 상수.
 *
 * 맵은 `public/models/bitcoin_island_draco.glb` 다. 전에는 이 파일이 방 치수를
 * **정의**했지만(평평한 바닥 위 사각형 벙커), 이제는 GLB 가 정의한 값을
 * **받아 적는다.** 여기 있는 좌표는 모두 그 GLB 에서 읽은 것이고,
 * `spaceWorld.test.ts` 가 GLB 를 직접 열어 어긋나지 않는지 고정한다.
 *
 * 1 unit = 1 m, 복셀 한 칸 0.25 m. 입구(선착장)가 +Z, 궁전이 −Z,
 * 무지개 다리가 +X 쪽이다.
 */

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** 동시 접속 상한. `InstancedMesh` 슬롯 수와 서버 좌석 수가 이 값을 따른다. */
export const SPACE_MAX_OCCUPANTS = 50;

/**
 * 섬의 층 높이.
 *
 * 벙커는 바닥이 평평해서 `y` 가 점프 중에만 0 을 벗어났다. 섬은 다층이라
 * **서 있는 높이 자체가 층마다 다르다.** 지면 높이는 런타임에 충돌 메시
 * 레이캐스트로 구하고(`SpaceTerrain`), 이 상수들은 스폰·조명·카메라처럼
 * 레이캐스트 없이 층을 가리켜야 하는 곳에서 쓴다.
 */
export const SPACE_ISLAND = {
  /** 바다. 섬 밖은 전부 이 높이다. */
  seaY: 0,
  /** 선착장. 광장으로 오르는 계단의 아랫단. */
  dockY: 0.5,
  /** 중앙 광장. 전광판 두 개와 원형극장 아랫단이 여기 있다. */
  plazaY: 5,
  /** 원형극장 윗단 테라스. */
  terraceY: 7.5,
  /** 궁전 단. 걸어서 닿는 가장 높은 층이다. */
  palaceY: 11,
} as const;

/**
 * 좌표로 허용하는 최대 높이(m).
 *
 * 서버가 이 값으로 들어온 좌표를 검증하고, 스냅샷은 1 cm 정밀도의
 * **2바이트**로 담는다(벙커 시절에는 1바이트 2.55 m 였다).
 *
 * **느슨한 위생 검사지 정확한 상한이 아니다.** 벙커는 바닥이 평평해 "지면 +
 * 점프 정점" 이 곧 상한이었지만, 섬은 지점마다 지면이 다르고 서버는 지형을
 * 모른다. 충돌 메시의 가장 높은 상향면이 궁전 첨탑 꼭대기(34 m)라 거기에
 * 점프 정점(1.13)과 여유를 더한 값으로 둔다. 실제로 걸어서 닿는 가장 높은
 * 층은 궁전 단(11 m)이고, 그 위를 막는 것은 클라이언트의 지형 충돌이다.
 *
 * 서버에서 층별로 조이려면 지형 높이맵을 서버에도 올려야 한다. 좌표를 조작한
 * 클라이언트가 공중에 뜨는 것은 외형 문제라 거기까지 가지 않는다 —
 * `SPACE_BOUNDS` 가 섬 밖으로 나가는 것만 막는 것과 같은 선택이다.
 */
export const SPACE_MAX_ALTITUDE = 36;

/**
 * 이동 가능 영역의 **바깥 상자**.
 *
 * 벙커에서는 이 사각형이 곧 걸을 수 있는 땅이었다. 섬은 원형이고 무지개
 * 다리가 +X 로 뻗어 있어 사각형으로는 모양을 담지 못한다. 실제 경계는
 * 충돌 메시(바다 쪽 가장자리의 높이 2.5 m 투명 벽)가 만들고, 이 값은
 * **레이캐스트가 비어 있을 때를 대비한 마지막 상자**다.
 *
 * 충돌 메시 범위(x −22.25~56.86, z −38~32)에 1 m 여유를 더했다. 서버도 이
 * 상자만 검증한다 — 섬 모양을 서버가 알 방법이 없다.
 */
export const SPACE_BOUNDS = {
  minX: -23.25,
  maxX: 57.86,
  minZ: -39,
  maxZ: 33,
} as const;

/**
 * 카메라가 들어갈 수 있는 범위.
 *
 * 3인칭 카메라는 플레이어 뒤에 있으므로 플레이어가 경계에 붙으면 카메라는
 * 경계 밖으로 나가야 한다. 벙커에서는 천장 아래로 가두는 것이 중요했지만
 * 섬은 하늘이 열려 있어 위쪽은 궁전 첨탑보다 높은 값이면 된다.
 *
 * 바깥으로 나간 카메라가 보는 것은 바다와 하늘이라 거슬리지 않는다. 지형을
 * 파고드는 것은 이 상자가 아니라 `resolveCameraCollision` 이 막는다.
 */
export const SPACE_CAMERA_BOUNDS = {
  minX: SPACE_BOUNDS.minX - 12,
  maxX: SPACE_BOUNDS.maxX + 12,
  minZ: SPACE_BOUNDS.minZ - 12,
  maxZ: SPACE_BOUNDS.maxZ + 12,
  /** 궁전 꼭대기(34 m)보다 위. 더 올라가 봐야 섬이 작아지기만 한다. */
  maxY: 40,
} as const;

/**
 * 스폰 링. 광장 한가운데 ₿ 문양을 **궁전 쪽 반원**으로 둘러싼다.
 *
 * 단일 지점이 아니라 링 안에 분산한다 — 50명이 같은 좌표에서 시작하면 아바타가
 * 완전히 겹친다.
 *
 * **반지름 9 m 가 상한이다.** 광장 소품(카페 테이블·화분·퍼걸러)은 모두
 * 중심에서 10.6 m 밖에 있고 원형극장 계단은 12 m 부터 시작한다. 서버도 같은
 * 함수로 스폰 좌표를 만드는데 서버에는 지형 충돌이 없으므로, **소품이 없는
 * 것이 확실한 범위**로 링을 묶어야 소품 안에서 시작하는 일이 없다. 11 m 까지
 * 넓혀 봤더니 스폰의 15%가 화단에 박혔다.
 *
 * **온전한 원이 아니라 반원인 이유는 카메라다.** 3인칭 카메라는 플레이어 뒤
 * 11~18 m 에 선다. 궁전(−Z)을 보고 서면 카메라는 +Z 로 물러나는데, +Z 쪽에
 * 스폰하면 카메라가 광장 밖 벚나무·화단·퍼걸러 사이에 박혀 첫 화면이 나무
 * 기둥으로 가린다. 궁전 쪽(−Z) 반원에서만 시작하면 카메라가 항상 광장 위를
 * 지나간다 — 충돌 메시로 300개 스폰을 재 보니 끼임이 16~29% 에서 **0%** 로
 * 떨어졌다(`spawnPoint.test.ts`).
 *
 * 대가는 스폰 밀도다. 가용 면적이 204 → 102 m² 로 줄어 50명 만석 기준
 * 2 m²/인이 된다. 아바타끼리는 통과하므로 겹쳐도 막히지는 않고, 만석은
 * 이론상 상한이라 실제로는 훨씬 여유롭다.
 */
export const SPACE_SPAWN_RING = {
  centerX: 0,
  centerZ: 0,
  /** 광장 바닥 높이. 스폰 좌표의 `y` 가 된다. */
  y: SPACE_ISLAND.plazaY,
  minRadius: 4,
  maxRadius: 9,
  /**
   * 호의 중심 방향(라디안). `−Z`(궁전 쪽)이다.
   *
   * `x = r·cos(a)`, `z = r·sin(a)` 기준이라 −Z 는 `−π/2` 다.
   */
  arcCenterAngle: -Math.PI / 2,
  /** 호의 반폭. `π/2` 면 궁전 쪽 반원 전체다. */
  arcHalfSpan: Math.PI / 2,
} as const;

/**
 * 스폰했을 때 바라보는 지점.
 *
 * 벙커에서는 뒷벽 전광판 하나를 보게 했다. 섬에서는 전광판 두 개가 광장
 * 양옆에 갈라져 있고 정면에는 궁전이 선다. 광장에서 가장 볼 만한 것이
 * 궁전이므로 그쪽(−Z)을 기준으로 삼는다.
 */
export const SPACE_SPAWN_FACING = [0, SPACE_ISLAND.palaceY, -26.25] as const;

/**
 * 광장 전광판 액자의 표시 영역.
 *
 * GLB 의 `Screen_BTCUSD` / `Screen_Network` 쿼드와 **같은 치수**다. 금장
 * 액자 안쪽의 어두운 홈이 이 크기이고, 그 안에 실시간 캔버스 패널을 끼운다.
 */
export const SPACE_SCREEN_FRAME = {
  width: 6,
  height: 2.75,
} as const;

/**
 * 패널의 설계 치수.
 *
 * **24:11 이다** — 맵의 금장 액자 안쪽(6.0 × 2.75)과 같은 비율. 텍스처
 * (1920 × 880)도 같은 비율이라 셋이 어긋나지 않는다. 16:9 였을 때는 높이에
 * 맞춰 끼우느라 좌우로 0.56 m 씩 빈 홈이 남았다.
 */
export const SPACE_BILLBOARD = {
  width: 9.6,
  height: 4.4,
  /** 가격 숫자 크기 기준 거리. 광장 반대편에서 보는 거리다. */
  referenceViewDistance: 24,
} as const;

/**
 * 설계 치수(9.6 × 4.4)를 액자 안으로 줄이는 배율.
 *
 * 비율이 액자와 같아져서 **높이로 맞추든 폭으로 맞추든 같은 값**이 된다
 * (2.75 / 4.4 = 6.0 / 9.6 = 0.625). 액자 안쪽 홈을 정확히 채운다.
 */
export const SPACE_SCREEN_SCALE = SPACE_SCREEN_FRAME.height / SPACE_BILLBOARD.height;

/**
 * 블록 현황판. 전광판과 **같은 규격**을 쓴다.
 *
 * 광장 양옆 액자 두 개가 좌우 대칭이라 치수가 다르면 한쪽이 보조처럼 읽힌다.
 */
export const SPACE_BLOCK_DASHBOARD = {
  width: SPACE_BILLBOARD.width,
  height: SPACE_BILLBOARD.height,
} as const;

/**
 * 전광판 액자의 월드 배치.
 *
 * GLB 의 `Screen_*` 쿼드 중심과 법선에서 읽은 값이다. 두 액자는 광장 중심에서
 * 반지름 14.25 m, 각각 144° / 36° 에 서서 **광장 안쪽을 바라본다.** 법선이
 * `(sin θ, 0, cos θ)` 이므로 기본 법선 +Z 인 평면을 Y축으로 θ 만큼 돌린 것과
 * 같다.
 *
 * `y` 는 표시 영역의 중심(7.25 ~ 10 m) 이다.
 */
export const SPACE_SCREEN_PLACEMENTS = {
  billboard: {
    position: [-11.318148, 8.625, -8.223116] as const,
    rotationY: toRadians(54),
  },
  blockDashboard: {
    position: [11.318148, 8.625, -8.223116] as const,
    rotationY: toRadians(-54),
  },
} as const;

/**
 * 패널이 광장 바닥을 물들이는 광원 위치.
 *
 * 액자보다 낮고 광장 안쪽으로 2.5 m 당겨 둔다. 패널을 따라 올리면 바닥까지의
 * 거리가 멀어져(감쇠 제곱) 오렌지 반사가 거의 사라진다. 패널 자체는 발광
 * 재질이라 광원과 분리해도 밝기가 유지되므로 광원만 낮게 고정한다.
 */
const toGlowPosition = (placement: { position: readonly [number, number, number] }) => {
  const [x, , z] = placement.position;
  const pull = 2.5 / Math.hypot(x, z);

  return [x * (1 - pull), SPACE_ISLAND.plazaY + 1.5, z * (1 - pull)] as const;
};

export const SPACE_SCREEN_GLOW_POSITIONS = [
  toGlowPosition(SPACE_SCREEN_PLACEMENTS.billboard),
  toGlowPosition(SPACE_SCREEN_PLACEMENTS.blockDashboard),
] as const;

/**
 * 전광판 위에 얹는 텍스트 전용 광고 배너.
 *
 * 전광판 패널과 같은 폭을 쓰며, 높이 0.8 m 의 12:1 배너다. 별도 프레임 메시를
 * 두지 않는다 — 높이가 0.8 m 뿐이라 테두리 메시를 더하면 패널보다 테두리가
 * 두꺼워 보인다. 테두리는 텍스처에 그린다.
 *
 * 좌표는 **전광판 패널 기준 상대값**이다. 패널이 액자에 맞춰 축소되므로
 * 배너도 같은 그룹 안에서 함께 줄어든다.
 */
export const SPACE_TEXT_BANNER = {
  width: SPACE_BILLBOARD.width,
  height: 0.8,
  /** 패널 윗변(+2.7)에서 0.2 띄우고 배너 반높이(0.4)를 더한 값. */
  offset: [0, 3.3, 0] as const,
} as const;

/** 명찰·말풍선 표시 상한. 인원 비례가 아니라 DOM 렌더 비용의 상한이다. */
export const SPACE_OVERLAY_LIMITS = {
  /**
   * 명찰 표시 거리.
   *
   * 스폰 링 지름(18 m)에 여유를 더하고, 광장에서 궁전 단까지(약 38 m) 올려다볼
   * 때도 이름이 보이도록 잡는다. DOM 비용을 정하는 것은 거리가 아니라
   * `nameplateMaxCount` 다 — 가까운 순으로 16개만 그리므로 거리를 늘려도
   * 노드 수는 그대로다.
   */
  nameplateMaxDistance: 44,
  nameplateMaxCount: 16,
  bubbleMaxCount: 12,
  bubbleTtlMs: 5_000,
} as const;
