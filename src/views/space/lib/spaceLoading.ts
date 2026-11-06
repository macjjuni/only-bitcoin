import type { SpacePresenceStatus } from "@/entities/space";

/**
 * 입장 로딩 단계 판정.
 *
 * 맵·내 캐릭터·서버 접속 세 갈래를 따로 기다림. 서버는 못 붙어도 혼자 걸어다닐
 * 수 있어서 실패·시간 초과면 오프라인으로 들여보냄. 맵과 캐릭터는 없으면 화면이
 * 비므로 끝까지 기다리되, 상한을 넘기면 갇히지 않게 그냥 열어 줌.
 */
export const SPACE_LOADING = {
  /** 서버 접속을 기다리는 최대 시간. 넘기면 오프라인으로 입장. */
  serverTimeoutInMilliseconds: 8_000,
  /** 무엇이 안 끝나도 오버레이를 걷는 상한. 로딩 화면에 갇히는 것보다 나음. */
  hardTimeoutInMilliseconds: 25_000,
  /** 오버레이가 사라지는 페이드 시간. */
  fadeOutInMilliseconds: 400,
} as const;

/** `skipped` 는 기다릴 필요가 없는 단계(더미 측정·접속 주소 미설정). */
export type SpaceLoadStageStatus = "pending" | "done" | "failed" | "skipped";

export interface SpaceLoadStages {
  map: SpaceLoadStageStatus;
  avatar: SpaceLoadStageStatus;
  server: SpaceLoadStageStatus;
}

export interface ServerLoadStageInput {
  presenceStatus: SpacePresenceStatus;
  hasSessionError: boolean;
  isConnectionConfigured: boolean;
  isDummyMode: boolean;
  isServerTimedOut: boolean;
}

/**
 * 서버 접속 단계 상태.
 *
 * 세션은 시작 전에도 `offline` 이라 그것만으로는 실패로 못 봄. 에러가 왔거나
 * 시간이 넘었을 때만 실패로 침.
 */
export const resolveServerLoadStage = ({
  presenceStatus,
  hasSessionError,
  isConnectionConfigured,
  isDummyMode,
  isServerTimedOut,
}: ServerLoadStageInput): SpaceLoadStageStatus => {
  if (isDummyMode || !isConnectionConfigured) {
    return "skipped";
  }

  if (presenceStatus === "online") {
    return "done";
  }

  if (hasSessionError || isServerTimedOut) {
    return "failed";
  }

  return "pending";
};

/** 단계가 더는 기다릴 게 없는지. */
export const isLoadStageSettled = (status: SpaceLoadStageStatus): boolean => {
  return status !== "pending";
};

/** 세 단계가 모두 끝났는지. 상한을 넘겼으면 무조건 끝난 것으로 봄. */
export const isSpaceLoadingComplete = (
  stages: SpaceLoadStages,
  isHardTimedOut: boolean,
): boolean => {
  if (isHardTimedOut) {
    return true;
  }

  return (
    isLoadStageSettled(stages.map) &&
    isLoadStageSettled(stages.avatar) &&
    isLoadStageSettled(stages.server)
  );
};

/**
 * 진행률(0~100).
 *
 * 에셋 다운로드 진행률만 쓰면 서버를 기다리는 동안 100% 에 멈춰 있어 보임. 세
 * 단계를 1/3 씩 나눠 끝난 단계만큼 채우고, 남은 몫은 다운로드 진행률로 채움.
 */
export const resolveSpaceLoadingPercent = (
  stages: SpaceLoadStages,
  assetPercent: number,
): number => {
  const stageList = [stages.map, stages.avatar, stages.server];
  const settledCount = stageList.filter(isLoadStageSettled).length;
  const assetStageCount = [stages.map, stages.avatar].filter(
    (status) => !isLoadStageSettled(status),
  ).length;
  const clampedAssetRatio = Math.min(Math.max(assetPercent, 0), 100) / 100;
  const assetShare = assetStageCount * clampedAssetRatio * 0.9;

  return Math.round(((settledCount + assetShare) / stageList.length) * 100);
};
