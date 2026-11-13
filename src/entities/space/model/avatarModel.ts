/**
 * 아바타 모델.
 *
 * 에셋은 `scripts/bake-avatar.mjs` 가 리깅된 GLB 에서 구움. 메시(`.glb`)와 모든 모션의
 * 본 행렬(`-clips.bin`) 두 파일이 나오고, 스크립트가 찍어 주는 모션 표를 아래에 옮겨 적음.
 * 어긋나면 `crewModel.test.ts` 가 `.bin` 크기와 표를 맞대어 잡아냄.
 *
 * 모델 번호(`modelIndex`)는 이 목록의 순서임. 번호가 프로토콜에 실려 다니고 브라우저에
 * 저장되므로 **순서를 바꾸거나 중간을 지우지 말고 끝에 덧붙임.**
 */

/**
 * 구워 둔 모션.
 *
 * `idle` · `walk` · `run` 은 반복하고 나머지는 한 번만 재생함.
 */
export type SpaceAvatarClip = "idle" | "walk" | "run" | "attack" | "hit" | "death" | "revive";

/** 모션 하나가 `-clips.bin` 에서 차지하는 자리. */
export interface SpaceAvatarClipRange {
  /** 시작 줄. 한 줄이 한 프레임임. */
  startFrame: number;
  /**
   * 프레임 수. **끝 프레임까지 포함**함.
   *
   * 반복 모션은 끝 프레임이 첫 프레임과 같은 자세임. 셰이더가 다음 줄과 보간할 때
   * 끝에서 처음으로 돌아가는 계산을 안 해도 되게 그렇게 구웠음.
   */
  frameCount: number;
  /** 원래 재생 길이(초). */
  seconds: number;
}

/**
 * 캐릭터의 공격 성격. 서버 판정과 클라이언트 연출이 같이 씀.
 *
 * **초당 피해는 캐릭터끼리 비슷하게 둠**(10 ~ 11). 한 캐릭터가 확실히 세면 다들 그것만
 * 고름. 차이는 싸우는 방식에 둠 — 느리고 묵직한 한 방이냐, 빠르고 약한 연타냐.
 */
export interface SpaceAvatarCombat {
  /** 공격 한 번이 보스에게 주는 피해. */
  kickDamage: number;
  /** 다시 공격할 수 있기까지(ms). 버튼에 남은 시간을 그림. */
  cooldownMs: number;
  /**
   * 공격 모션을 이 시간에 맞춰 틂(초). 쿨다운보다 짧아야 함.
   *
   * 길면 다음 공격이 앞 모션을 끊고 시작해 휘두르다 만 것처럼 보임.
   */
  attackSeconds: number;
}

export interface SpaceAvatarModel {
  id: string;
  /** 화면에 보이는 이름. */
  label: string;
  /** 이름 옆 색 점. 플레이어 색과 무관하게 모델마다 고정. */
  swatchColor: string;
  modelUrl: string;
  /** 모든 모션의 본 행렬. 반정밀도 실수임. */
  clipsUrl: string;
  /** 몸통. 무기가 모델에 들어 있으면 여기에 합쳐져 있음. */
  bodyMeshName: string;
  /** 플레이어 색을 받는 부위. 버거빠따킹는 가슴 띠임. */
  accentMeshName: string;
  /** 발광하는 눈 메시. 없는 모델은 `null`. */
  pupilGlintMeshName: string | null;
  /**
   * 몸통과 따로 그리는 무기 메시. 무기를 몸통에 합친 모델은 `null`.
   *
   * 몸통이 아틀라스 텍스처를 쓰는데 무기가 단색 재질이면 한 재질로 합칠 수 없어 따로 둠.
   * 드로우 콜이 하나 늚.
   */
  weaponMeshName: string | null;
  /**
   * 모델 키(m).
   *
   * 발바닥이 원점이라 런타임은 이 값으로 배치하지 않음. glb 를 검증하는 데 씀.
   */
  height: number;
  /** 명찰·말풍선이 매달리는 머리 중심. */
  headCenterY: number;
  /** `-clips.bin` 의 전체 프레임 수. 로더가 파일 크기를 이 값으로 검증하고 텍스처 높이로 씀. */
  clipFrameCount: number;
  clips: Readonly<Record<SpaceAvatarClip, SpaceAvatarClipRange>>;
  combat: SpaceAvatarCombat;
  /**
   * glb 의 삼각형 수. 예산 계산에 씀(`docs/btc-space-3d.md` §8).
   *
   * 접지 그림자 평면(2 tri)은 모델 밖이라 뺌.
   */
  triangleCount: number;
}

export const SPACE_AVATAR_MODELS: readonly SpaceAvatarModel[] = [
  {
    id: "nightshift",
    label: "버거빠따킹",
    swatchColor: "#526e35",
    modelUrl: "/models/nightshift.glb",
    clipsUrl: "/models/nightshift-clips.bin",
    // 철조망 방망이가 몸통 메시에 합쳐져 있음. 같은 아틀라스를 써서 드로우 콜이 안 늚.
    bodyMeshName: "nightshift_body",
    accentMeshName: "nightshift_accent",
    pupilGlintMeshName: "nightshift_pupil_glint",
    weaponMeshName: null,
    height: 1.81,
    headCenterY: 1.473,
    clipFrameCount: 235,
    clips: {
      idle: { startFrame: 0, frameCount: 49, seconds: 2 },
      walk: { startFrame: 49, frameCount: 33, seconds: 1.3333 },
      run: { startFrame: 82, frameCount: 23, seconds: 0.9167 },
      attack: { startFrame: 105, frameCount: 27, seconds: 1.0833 },
      hit: { startFrame: 132, frameCount: 18, seconds: 0.7083 },
      death: { startFrame: 150, frameCount: 39, seconds: 1.5833 },
      revive: { startFrame: 189, frameCount: 46, seconds: 1.875 },
    },
    // 철조망 방망이. 느리고 묵직한 한 방. 보스 공격 사이의 틈에 한 대 넣고 빠지는 식.
    combat: { kickDamage: 16, cooldownMs: 1_500, attackSeconds: 0.9 },
    triangleCount: 2986,
  },
  {
    id: "redcrew",
    label: "맥시크루",
    swatchColor: "#dc2626",
    modelUrl: "/models/redcrew.glb",
    clipsUrl: "/models/redcrew-clips.bin",
    // 텍스처 없이 정점 색으로 칠함. 렌치가 몸통 메시에 합쳐져 있고, 렌치의 재질 색은
    // 구울 때 정점 색으로 옮겼음(금속 재질은 몸통과 한 재질로 못 합쳐서).
    bodyMeshName: "redcrew_body",
    // 앞치마가 플레이어 색을 받음.
    accentMeshName: "redcrew_accent",
    pupilGlintMeshName: "redcrew_pupil_glint",
    weaponMeshName: null,
    height: 1.81,
    headCenterY: 1.484,
    // 뼈대와 모션이 버거빠따킹과 같아 표도 같음.
    clipFrameCount: 235,
    clips: {
      idle: { startFrame: 0, frameCount: 49, seconds: 2 },
      walk: { startFrame: 49, frameCount: 33, seconds: 1.3333 },
      run: { startFrame: 82, frameCount: 23, seconds: 0.9167 },
      attack: { startFrame: 105, frameCount: 27, seconds: 1.0833 },
      hit: { startFrame: 132, frameCount: 18, seconds: 0.7083 },
      death: { startFrame: 150, frameCount: 39, seconds: 1.5833 },
      revive: { startFrame: 189, frameCount: 46, seconds: 1.875 },
    },
    // 렌치. 기준이 되는 표준형.
    combat: { kickDamage: 10, cooldownMs: 1_000, attackSeconds: 0.55 },
    triangleCount: 1212,
  },
  {
    id: "pepe",
    label: "코인충",
    swatchColor: "#22c55e",
    modelUrl: "/models/pepe.glb",
    clipsUrl: "/models/pepe-clips.bin",
    bodyMeshName: "pepe_body",
    // 셔츠 몸판과 양 소매가 플레이어 색을 받음.
    accentMeshName: "pepe_accent",
    // 눈이 머리 메시의 픽셀이라 떼어 낼 눈 메시가 없음.
    pupilGlintMeshName: null,
    // 파리채. 몸통은 아틀라스를 쓰고 파리채는 단색이라 못 합쳐서 따로 그림.
    weaponMeshName: "pepe_weapon",
    // 다른 모델보다 작음.
    height: 1.6,
    headCenterY: 1.3303,
    // 뼈대가 달라(본 21개) 걷기·공격 길이도 다른 모델과 다름.
    clipFrameCount: 234,
    clips: {
      idle: { startFrame: 0, frameCount: 49, seconds: 2 },
      walk: { startFrame: 49, frameCount: 41, seconds: 1.6667 },
      run: { startFrame: 90, frameCount: 23, seconds: 0.9167 },
      attack: { startFrame: 113, frameCount: 18, seconds: 0.7083 },
      hit: { startFrame: 131, frameCount: 18, seconds: 0.7083 },
      death: { startFrame: 149, frameCount: 39, seconds: 1.5833 },
      revive: { startFrame: 188, frameCount: 46, seconds: 1.875 },
    },
    // 파리채. 빠르고 약한 연타. 붙어서 계속 때려야 해서 맞을 일도 많음.
    combat: { kickDamage: 6, cooldownMs: 550, attackSeconds: 0.45 },
    triangleCount: 1498,
  },
] as const;

export const SPACE_DEFAULT_AVATAR_MODEL_INDEX = 0;

/**
 * 모델 번호를 목록 범위로 접음.
 *
 * 서버가 보낸 번호나 저장소에 남은 옛 번호가 범위를 벗어날 수 있음. 캐릭터가 7종이던
 * 때 접속한 탭은 1 ~ 7 을 들고 있음. 그때 아바타를 안 그리는 대신 기본 모델로 떨어뜨림.
 * 사람이 사라지는 쪽이 더 나쁨.
 */
export const resolveAvatarModelIndex = (modelIndex: unknown): number => {
  return isAvatarModelIndex(modelIndex) ? modelIndex : SPACE_DEFAULT_AVATAR_MODEL_INDEX;
};

export const resolveAvatarModel = (modelIndex: number): SpaceAvatarModel => {
  return SPACE_AVATAR_MODELS[resolveAvatarModelIndex(modelIndex)];
};

/** 그 모델의 공격 성격. 범위 밖 번호는 기본 모델의 것을 줌. */
export const resolveAvatarCombat = (modelIndex: number): SpaceAvatarCombat => {
  return resolveAvatarModel(modelIndex).combat;
};

/** 지금 목록에 있는 모델 번호인지. 서버가 모델 변경 요청을 검사할 때 씀. */
export const isAvatarModelIndex = (value: unknown): value is number => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < SPACE_AVATAR_MODELS.length
  );
};
