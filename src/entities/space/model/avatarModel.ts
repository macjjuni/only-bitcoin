/**
 * 고를 수 있는 아바타 모델.
 *
 * 세 모델은 **본 22개**를 공유한다. 본 수가 셰이더의 텍셀 조회 폭을 정하므로
 * 이것만은 반드시 같아야 한다 — 어긋나면 엉뚱한 텍셀을 읽어 아바타가 터진다.
 *
 * **Walk 프레임 수는 모델마다 다를 수 있다**(크루·곰 40, 황소 48). 셰이더가
 * 프레임 수를 상수로 박지 않고 본 행렬 텍스처의 높이에서 읽기 때문이다.
 * 지오메트리·아틀라스·눈 글린트 유무도 모델마다 다르다.
 *
 * 에셋은 `scripts/blender/process-voxel-character.py` 가 `.blend` 에서 굽는다.
 */
export interface SpaceAvatarModel {
  id: string;
  /** 선택 UI 에 보이는 이름. */
  label: string;
  modelUrl: string;
  walkUrl: string;
  bodyMeshName: string;
  accentMeshName: string;
  /**
   * 붉게 발광하는 눈동자 메시.
   *
   * 크루는 `apply-laser-eyes-to-crew.py` 가 레이저아이 변형 glb 에서 UV·발광
   * 마스크를 옮겨 만든다. 황소는 변형본이 없어 가공 스크립트가 눈동자 메시를
   * 떼어 단색 발광 재질을 입힌다. 곰은 눈동자 메시가 따로 없어 `null`.
   */
  pupilGlintMeshName: string | null;
  /** 명찰·말풍선이 매달리는 머리 중심. 가공 스크립트의 `[anchor]` 값. */
  headCenterY: number;
  /**
   * Walk `.bin` 의 프레임 수. 가공 스크립트의 `[export] 프레임=` 값.
   *
   * 로더가 `.bin` 크기를 이 값으로 검증하고 텍스처 높이로 쓴다. 틀리면 셰이더가
   * 엉뚱한 텍셀을 읽는다.
   */
  walkFrameCount: number;
  /**
   * glb 의 삼각형 수. 예산 계산에 쓴다(§8).
   *
   * 접지 그림자 평면(2 tri)은 모델 밖이라 포함하지 않는다.
   */
  triangleCount: number;
}

export const SPACE_AVATAR_MODELS: readonly SpaceAvatarModel[] = [
  {
    id: "crew",
    label: "크루",
    modelUrl: "/models/crew.glb",
    walkUrl: "/models/crew-walk.bin",
    bodyMeshName: "crew_body",
    accentMeshName: "crew_accent",
    pupilGlintMeshName: "crew_pupil_glint",
    headCenterY: 1.484,
    walkFrameCount: 40,
    triangleCount: 1240,
  },
  {
    id: "bear",
    label: "곰",
    modelUrl: "/models/bear.glb",
    walkUrl: "/models/bear-walk.bin",
    bodyMeshName: "bear_body",
    accentMeshName: "bear_accent",
    pupilGlintMeshName: null,
    headCenterY: 1.4758,
    walkFrameCount: 40,
    triangleCount: 1504,
  },
  {
    id: "bull",
    label: "황소",
    modelUrl: "/models/bull.glb",
    walkUrl: "/models/bull-walk.bin",
    bodyMeshName: "bull_body",
    accentMeshName: "bull_accent",
    pupilGlintMeshName: "bull_pupil_glint",
    headCenterY: 1.4638,
    // Walk 가 48프레임이다. 셰이더는 텍스처 높이에서 읽으므로 그대로 쓴다.
    walkFrameCount: 48,
    triangleCount: 1972,
  },
] as const;

export const SPACE_DEFAULT_AVATAR_MODEL_INDEX = 0;

/**
 * 모델 번호를 목록 범위로 접는다.
 *
 * 서버가 보낸 번호나 저장소에 남은 옛 번호가 범위를 벗어날 수 있다. 그때
 * 아바타를 안 그리는 대신 기본 모델로 떨어뜨린다 — 사람이 사라지는 쪽이 더 나쁘다.
 */
export const resolveAvatarModel = (modelIndex: number): SpaceAvatarModel => {
  const isValid =
    Number.isInteger(modelIndex) && modelIndex >= 0 && modelIndex < SPACE_AVATAR_MODELS.length;

  return SPACE_AVATAR_MODELS[isValid ? modelIndex : SPACE_DEFAULT_AVATAR_MODEL_INDEX];
};

/** 프로토콜로 받은 값을 그대로 쓸 수 있는지. 서버·클라이언트가 같은 판정을 쓴다. */
export const isAvatarModelIndex = (value: unknown): value is number => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < SPACE_AVATAR_MODELS.length
  );
};
