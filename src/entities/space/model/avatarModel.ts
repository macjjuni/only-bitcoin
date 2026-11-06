/**
 * 고를 수 있는 아바타 모델.
 *
 * 모든 모델의 Walk `.bin` 은 **본 22칸** 폭임. 본 수가 셰이더의 텍셀 조회 폭을 정해서
 * 이것만은 꼭 같아야 함. 어긋나면 엉뚱한 텍셀을 읽어 아바타가 터짐.
 *
 * **Walk 프레임 수는 모델마다 다를 수 있음**(크루·곰 40, 황소 48). 셰이더가
 * 프레임 수를 상수로 박지 않고 본 행렬 텍스처 높이에서 읽어서임.
 * 지오메트리·아틀라스·눈 글린트 유무도 모델마다 다름.
 *
 * 에셋은 `scripts/blender/process-voxel-character.py` 가 `.blend` 에서 구움.
 */
/** 아바타별 무기. 기본은 렌치, 머슼크는 도지코인, 빚탈릭은 똥, 세일러문은 비트코인 동전. */
export type SpaceWeaponId =
  /** 기본 무기. 비트코인 밈 "$5 렌치 공격". */
  | "wrench"
  /** 머슼크 전용. 손에 쥔 큰 도지코인(시바 이미지). */
  | "dogeCoin"
  /** 세일러문 전용. 손에 쥔 큰 비트코인 동전(₿). */
  | "bitcoinCoin"
  /** 빚탈릭 전용. 손에 쥔 💩. "똥코인" 개그. */
  | "poop";

export interface SpaceAvatarModel {
  id: string;
  /** 선택 UI 에 보이는 이름. */
  label: string;
  /** 선택 UI 이름 옆 색 점. 플레이어 색과 무관하게 모델마다 고정. */
  swatchColor: string;
  modelUrl: string;
  walkUrl: string;
  /** 발차기 본 행렬. 프레임 수는 모든 모델이 같음(`CREW_KICK.frameCount`). */
  kickUrl: string;
  bodyMeshName: string;
  accentMeshName: string;
  /**
   * 붉게 발광하는 눈동자 메시.
   *
   * 크루는 `apply-laser-eyes-to-crew.py` 가 레이저아이 변형 glb 에서 UV·발광
   * 마스크를 옮겨 만듦. 황소는 변형본이 없어 가공 스크립트가 눈동자 메시를
   * 떼어 단색 발광 재질을 입힘. 곰은 눈동자 메시가 따로 없어 `null`.
   */
  pupilGlintMeshName: string | null;
  /**
   * 모델 키(m). 가공 스크립트의 `--height` 값. 생략하면 1.81.
   *
   * 발바닥이 원점이라 런타임은 이 값으로 배치하지 않음. glb 를 검증하는 데 씀.
   */
  height: number;
  /** 명찰·말풍선이 매달리는 머리 중심. 가공 스크립트의 `[anchor]` 값. */
  headCenterY: number;
  /**
   * 렌치를 붙이는 오른손 위치(모델 좌표, 배율 전). 가공 스크립트의 `[anchor] handPivot` 값.
   *
   * 손 본의 머리·꼬리 가운데임. 크루·곰·황소는 팔이 한 덩어리라 손 정점이 없어 본으로 잼.
   */
  handPivot: readonly [number, number, number];
  /**
   * 공격할 때 손에 나타나는 무기. 모양만 다르고 사거리·넉백·쿨다운은 모두 같음.
   *
   * 성능이 다르면 다들 센 아바타만 고름. 모양은 `views/space/lib/weaponModel.ts`.
   */
  weapon: SpaceWeaponId;
  /**
   * Walk `.bin` 의 프레임 수. 가공 스크립트의 `[export] 프레임=` 값.
   *
   * 로더가 `.bin` 크기를 이 값으로 검증하고 텍스처 높이로 씀. 틀리면 셰이더가
   * 엉뚱한 텍셀을 읽음.
   */
  walkFrameCount: number;
  /**
   * glb 의 삼각형 수. 예산 계산에 씀(§8).
   *
   * 접지 그림자 평면(2 tri)은 모델 밖이라 뺌.
   */
  triangleCount: number;
}

export const SPACE_AVATAR_MODELS: readonly SpaceAvatarModel[] = [
  {
    id: "crew",
    label: "맥시크루",
    swatchColor: "#f7931a",
    modelUrl: "/models/crew.glb",
    walkUrl: "/models/crew-walk.bin",
    kickUrl: "/models/crew-kick.bin",
    bodyMeshName: "crew_body",
    accentMeshName: "crew_accent",
    pupilGlintMeshName: "crew_pupil_glint",
    height: 1.81,
    headCenterY: 1.484,
    handPivot: [0.2719, 0.7603, 0],
    weapon: "wrench",
    walkFrameCount: 40,
    triangleCount: 1240,
  },
  {
    id: "bear",
    label: "숏베어",
    swatchColor: "#3b82f6",
    modelUrl: "/models/bear.glb",
    walkUrl: "/models/bear-walk.bin",
    kickUrl: "/models/bear-kick.bin",
    bodyMeshName: "bear_body",
    accentMeshName: "bear_accent",
    pupilGlintMeshName: null,
    height: 1.81,
    headCenterY: 1.4758,
    handPivot: [0.2717, 0.7596, 0],
    weapon: "wrench",
    walkFrameCount: 40,
    triangleCount: 1504,
  },
  {
    id: "bull",
    label: "풀롱불",
    swatchColor: "#ef4444",
    modelUrl: "/models/bull.glb",
    walkUrl: "/models/bull-walk.bin",
    kickUrl: "/models/bull-kick.bin",
    bodyMeshName: "bull_body",
    accentMeshName: "bull_accent",
    pupilGlintMeshName: "bull_pupil_glint",
    height: 1.81,
    headCenterY: 1.4638,
    handPivot: [0.2645, 0.7397, 0],
    weapon: "wrench",
    // Walk 가 48프레임임. 셰이더는 텍스처 높이에서 읽어서 그대로 씀.
    walkFrameCount: 48,
    triangleCount: 1972,
  },
  {
    id: "pepe",
    label: "코인충",
    swatchColor: "#22c55e",
    modelUrl: "/models/pepe.glb",
    walkUrl: "/models/pepe-walk.bin",
    kickUrl: "/models/pepe-kick.bin",
    bodyMeshName: "pepe_body",
    // 셔츠 몸판과 양 소매가 플레이어 색을 받음. 앞판만 따로 떼면 소매만 파랗게 남음.
    accentMeshName: "pepe_accent",
    pupilGlintMeshName: null,
    // 원본 키 그대로 둠. 다른 모델보다 작음.
    height: 1.6,
    headCenterY: 1.3303,
    handPivot: [0.25, 0.565, 0],
    weapon: "wrench",
    // 원본 본은 20개라 가공 스크립트가 남는 2칸을 항등 행렬로 채웠음.
    walkFrameCount: 40,
    triangleCount: 1286,
  },
  {
    id: "elon",
    label: "머슼크",
    swatchColor: "#ef4444",
    modelUrl: "/models/elon.glb",
    walkUrl: "/models/elon-walk.bin",
    kickUrl: "/models/elon-kick.bin",
    bodyMeshName: "elon_body",
    // 연 재킷 안 티셔츠가 플레이어 색을 받음. 재킷은 원래대로 검정.
    accentMeshName: "elon_accent",
    // 눈이 머리 메시의 픽셀이라 떼어 낼 눈동자 메시가 없음.
    pupilGlintMeshName: null,
    height: 1.8,
    headCenterY: 1.4771,
    handPivot: [0.31, 0.68, 0],
    weapon: "dogeCoin",
    // 본 20개라 페페처럼 2칸을 항등 행렬로 채웠음.
    walkFrameCount: 40,
    triangleCount: 3202,
  },
  {
    id: "vitalik",
    label: "빚탈릭",
    swatchColor: "#8b5cf6",
    modelUrl: "/models/vitalik.glb",
    walkUrl: "/models/vitalik-walk.bin",
    kickUrl: "/models/vitalik-kick.bin",
    bodyMeshName: "vitalik_body",
    // 티셔츠 몸판·양 소매·목 테두리가 플레이어 색을 받음. 가슴 이더리움 아이콘은
    // 따로 붙은 메시라 몸통에 남아 색이 바뀌어도 그대로 보임. 등 똥 아이콘은
    // `remove-poop-from-vitalik.py` 로 지웠음.
    accentMeshName: "vitalik_accent",
    // 눈이 머리 메시의 픽셀이라 떼어 낼 눈동자 메시가 없음.
    pupilGlintMeshName: null,
    height: 1.8,
    headCenterY: 1.4606,
    handPivot: [0.1693, 0.7025, 0],
    weapon: "poop",
    // 본 20개라 2칸을 항등 행렬로 채웠음.
    walkFrameCount: 40,
    triangleCount: 1522,
  },
  {
    id: "saylor",
    label: "세일러문",
    swatchColor: "#eab308",
    modelUrl: "/models/saylor.glb",
    walkUrl: "/models/saylor-walk.bin",
    kickUrl: "/models/saylor-kick.bin",
    bodyMeshName: "saylor_body",
    // 정장 안 와이셔츠가 플레이어 색을 받음. 원본이 흰색(#f1efe9)이라 어떤 색도 제대로 올라옴.
    // 원본은 몸이 메시 하나라 `split-saylor-parts.py` 가 UV 타일로 셔츠를 떼어 냄.
    accentMeshName: "saylor_accent",
    // 레이저아이. 눈동자(`eye`)에 흰자(`eye_w`)까지 묶어 눈 전체를 발광시킴.
    // 눈동자만 6면이라 추종 카메라 거리에서 빛이 안 보였음.
    pupilGlintMeshName: "saylor_pupil_glint",
    height: 1.8,
    headCenterY: 1.4502,
    handPivot: [0.2793, 0.781, 0],
    weapon: "bitcoinCoin",
    // 황소처럼 Walk 가 48프레임임. 본은 22개를 꽉 써서 패딩이 없음.
    walkFrameCount: 48,
    triangleCount: 3392,
  },
] as const;

export const SPACE_DEFAULT_AVATAR_MODEL_INDEX = 0;

/**
 * 모델 번호를 목록 범위로 접음.
 *
 * 서버가 보낸 번호나 저장소에 남은 옛 번호가 범위를 벗어날 수 있음. 그때
 * 아바타를 안 그리는 대신 기본 모델로 떨어뜨림. 사람이 사라지는 쪽이 더 나쁨.
 */
export const resolveAvatarModel = (modelIndex: number): SpaceAvatarModel => {
  const isValid =
    Number.isInteger(modelIndex) && modelIndex >= 0 && modelIndex < SPACE_AVATAR_MODELS.length;

  return SPACE_AVATAR_MODELS[isValid ? modelIndex : SPACE_DEFAULT_AVATAR_MODEL_INDEX];
};

/** 지금 목록에 있는 모델 번호인지. 서버의 요청 검사·저장값 복원에 씀. 서버가 보낸 값은 범위만 봄(`spaceProtocol`). */
export const isAvatarModelIndex = (value: unknown): value is number => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < SPACE_AVATAR_MODELS.length
  );
};
