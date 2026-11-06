/** 아바타 치수와 색상 팔레트. 형상 자체는 `public/models/*.glb` 가 가짐. */

/**
 * 모델 바깥에서 필요한 아바타 치수.
 *
 * 형상은 모델 파일이 정함. 여기에는 모델이 알려줄 수 없는 값만 남김. 모델별 키·머리
 * 높이는 레지스트리(`SPACE_AVATAR_MODELS`)가 **배율 적용 전** 값으로 가짐.
 */
export const SPACE_AVATAR = {
  /**
   * 그릴 때 곱하는 배율. 모델 파일은 그대로 두고 화면에서만 키움.
   *
   * 맵(지름 약 80 m, 전광판 폭 28 m)에 비해 캐릭터가 작게 느껴져 1.2 배로 키웠음.
   * 모델을 다시 구우면 레이저 눈처럼 따로 가공한 모델까지 다시 만들어야 해서 그리기
   * 단계에서 곱함. 본 행렬은 모델 좌표라 걷기·발차기도 같이 커짐.
   *
   * 크기에 묶인 값(충돌, 걷기 보폭, 이름표 높이, 카메라 주시점, 발차기 거리)은 전부 이
   * 값에서 계산함. 이동 속도·점프·오를 수 있는 턱은 서버 검사·맵 단차와 묶여 그대로 둠.
   */
  scale: 1.2,
  /** 모델 전체 높이(배율 전). 발바닥이 원점이라 아바타는 `(x, 0, z)` 에 둠. */
  height: 1.81,
  /** 명찰·말풍선이 매달리는 머리 중심(배율 전). 모델에서 측정한 값임. */
  headCenterY: 1.484,
  /** 접지 그림자 블롭 반경(배율 전). 실시간 그림자 맵 대신 씀. */
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
