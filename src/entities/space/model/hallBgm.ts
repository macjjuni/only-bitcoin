/**
 * 홀 배경음악 선택. 유저가 바리스타 NPC 에게 말을 걸어 바꾸고, 홀에 있는 모두에게 같이 바뀜.
 *
 * 안뜰 곡(대기 · 보스전)은 내가 선 자리로 정해서 여기와 무관함.
 */

/** 서버·클라이언트가 같이 지원한다고 알리는 기능 이름. 아는 쪽에만 곡 프레임을 보냄. */
export const SPACE_FEATURE_HALL_BGM = "hall-bgm-v1";

/**
 * 고를 수 있는 곡. **서버가 이 목록으로 요청을 검사하므로 곡을 더하면 워커도 다시 배포함.**
 *
 * 음원 주소와 화면 이름은 클라이언트가 따로 듦(`spaceBgmTrack.ts`).
 */
export const SPACE_HALL_BGM_TRACKS = ["base", "surge", "rush", "phonk"] as const;

export type SpaceHallBgmTrack = (typeof SPACE_HALL_BGM_TRACKS)[number];

export const SPACE_HALL_BGM = {
  /**
   * 곡을 바꾼 뒤 다음에 바꿀 수 있기까지(ms). 방 전체에 하나임.
   *
   * 없으면 한 사람이 계속 바꿔서 나머지가 곡을 못 들음.
   */
  changeCooldownMs: 60_000,
  /** 바꾼다고 알린 뒤 실제로 바뀌기까지(ms). 다들 프레임을 받고 같은 순간에 넘어감. */
  leadMs: 700,
} as const;

export interface SpaceHallBgmState {
  track: SpaceHallBgmTrack;
  /** 곡의 처음이 놓이는 서버 시각. 늦게 들어온 사람도 같은 자리를 들음. */
  startsAt: number;
  /** 바꾼 서버 시각. 다음에 바꿀 수 있는 때를 여기서 셈. */
  changedAt: number;
  /** 바꾼 사람의 그때 이름. */
  byNickname: string;
}

const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export const isSpaceHallBgmTrack = (value: unknown): value is SpaceHallBgmTrack => {
  return SPACE_HALL_BGM_TRACKS.includes(value as SpaceHallBgmTrack);
};

export const isSpaceHallBgmState = (value: unknown): value is SpaceHallBgmState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = value as SpaceHallBgmState;

  return (
    isSpaceHallBgmTrack(state.track) &&
    isTimestamp(state.startsAt) &&
    isTimestamp(state.changedAt) &&
    typeof state.byNickname === "string" &&
    state.byNickname.length <= 128
  );
};

/** 다음에 곡을 바꿀 수 있는 서버 시각. 한 번도 안 바꿨으면 0. */
export const resolveHallBgmReadyAt = (state: SpaceHallBgmState | null): number => {
  return state ? state.changedAt + SPACE_HALL_BGM.changeCooldownMs : 0;
};
