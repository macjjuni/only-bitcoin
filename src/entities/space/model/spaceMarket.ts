import { SPACE_MAX_OCCUPANTS } from "./spaceWorld";

export const SPACE_FEATURE_MARKET = "market-sync-v1";
export const SPACE_MARKET = {
  pollIntervalMs: 10_000,
  eventLeadMs: 700,
  testCooldownMs: 30_000,
  burstCount: 3,
  burstIntervalMs: 10_000,
  burstDurationMs: 3200,
} as const;

export interface SpaceCelebration {
  id: string;
  startsAt: number;
  seed: number;
  /** 테스트 버튼을 누른 좌석. 그 사람의 명시적 소리 미리듣기에만 사용한다. */
  testSeat?: number;
}

export interface SpaceMarketState {
  revision: number;
  /** 급등락 중이면 `surge`. 클라이언트는 이 값으로 곡을 바꾸지 않고, 폭죽(`celebration`)만 씀. */
  track: "base" | "surge";
  direction: "rise" | "fall" | null;
  startsAt: number;
  /**
   * 급등락 곡을 미리 받으라는 표시였음. 지금은 서버가 늘 `false` 로 보내고 아무도 안 읽음.
   * 열어 둔 옛 탭이 이 칸이 없으면 프레임을 통째로 버려서 자리만 남김.
   */
  prefetch: boolean;
  celebration: SpaceCelebration | null;
}

const isTimestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export const isSpaceCelebration = (value: unknown): value is SpaceCelebration => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as SpaceCelebration;
  return (
    typeof event.id === "string" &&
    event.id.length > 0 &&
    event.id.length <= 128 &&
    isTimestamp(event.startsAt) &&
    Number.isSafeInteger(event.seed) &&
    event.seed >= 0 &&
    event.seed <= 0xffffffff &&
    (event.testSeat === undefined ||
      (Number.isInteger(event.testSeat) &&
        event.testSeat >= 0 &&
        event.testSeat < SPACE_MAX_OCCUPANTS))
  );
};

export const isSpaceMarketState = (value: unknown): value is SpaceMarketState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const state = value as SpaceMarketState;
  return (
    isTimestamp(state.revision) &&
    isTimestamp(state.startsAt) &&
    (state.track === "base"
      ? state.direction === null
      : state.track === "surge" && (state.direction === "rise" || state.direction === "fall")) &&
    typeof state.prefetch === "boolean" &&
    (state.celebration === null ||
      (state.direction === "rise" && isSpaceCelebration(state.celebration)))
  );
};
