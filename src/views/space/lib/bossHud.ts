import { resolveNextBossSpawnAt, SPACE_BOSS_PLAYER, type SpaceBossPhase } from "@/entities/space";

/**
 * 전투 UI 에 무엇을 띄울지 정함. 순수 함수임.
 *
 * 보스 체력은 여기서 안 다룸. 보스 머리 위에 뜨고 `RaidBoss` 가 직접 씀.
 *
 * 보스 체력·내 위치는 매 프레임 바뀌어 React 상태에 없음. `useBossHud` 가 1초에 몇 번
 * 이 함수로 화면에 쓸 값만 뽑아 상태로 올림.
 */

/** 보스 이름. 하락에 베팅하는 숏 곰들의 왕임. */
export const BOSS_NAME = "숏베어킹";

export interface BossHudInput {
  nowMs: number;
  /** 서버 시각 − 로컬 시각. 못 쟀으면 `null`. */
  clockOffsetMs: number | null;
  /** 서버가 보스를 지원하는지. 아니면 아무것도 안 띄움. */
  canFightBoss: boolean;
  bossPhase: SpaceBossPhase;
  /** 내 위치. 접속 전이면 `null`. */
  selfPosition: { x: number } | null;
  /** 화면에 보일 내 체력. 홀 안 회복을 반영한 값임. */
  selfHealth: number;
  /** 쓰러져 있는 끝 시각(로컬). 살아 있으면 `null`. */
  deadUntil: number | null;
}

export interface BossHudView {
  /** 내 체력바. */
  playerBar: { ratio: number; health: number } | null;
  /** 다시 움직일 수 있기까지 남은 초. 살아 있으면 `null`. */
  knockoutSeconds: number | null;
  /** 다음 젠까지 남은 초. 보스가 있거나 안뜰 밖이면 `null`. */
  nextSpawnSeconds: number | null;
}

export const EMPTY_BOSS_HUD_VIEW: BossHudView = {
  playerBar: null,
  knockoutSeconds: null,
  nextSpawnSeconds: null,
};

// region [Privates]
const clampRatio = (value: number): number => Math.min(1, Math.max(0, value));

/** 안뜰에 나와 있는지. 홀 +X 외벽 너머가 안뜰임. */
const isInCourtyard = (selfPosition: BossHudInput["selfPosition"]): boolean => {
  return selfPosition !== null && selfPosition.x > SPACE_BOSS_PLAYER.hallMaximumX;
};
// endregion

export const resolveBossHudView = (input: BossHudInput): BossHudView => {
  if (!input.canFightBoss) {
    return EMPTY_BOSS_HUD_VIEW;
  }

  const { maximumHealth } = SPACE_BOSS_PLAYER;
  const isOutside = isInCourtyard(input.selfPosition);
  const isBossPresent = input.bossPhase !== "hidden";
  const isKnockedOut = input.deadUntil !== null && input.nowMs < input.deadUntil;
  const shouldShowPlayerBar =
    !isKnockedOut && (input.selfHealth < maximumHealth || (isOutside && isBossPresent));
  const serverNowMs = input.clockOffsetMs === null ? null : input.nowMs + input.clockOffsetMs;

  return {
    playerBar: shouldShowPlayerBar
      ? { ratio: clampRatio(input.selfHealth / maximumHealth), health: Math.ceil(input.selfHealth) }
      : null,
    knockoutSeconds:
      isKnockedOut && input.deadUntil !== null
        ? Math.ceil((input.deadUntil - input.nowMs) / 1000)
        : null,
    nextSpawnSeconds:
      !isBossPresent && isOutside && serverNowMs !== null
        ? Math.ceil((resolveNextBossSpawnAt(serverNowMs) - serverNowMs) / 1000)
        : null,
  };
};

/**
 * 화면에 보일 내 체력을 한 걸음 진행함.
 *
 * 홀 안 회복은 서버가 프레임을 안 보냄(이동이 올 때 지난 시간만큼 정산할 뿐임).
 * 같은 식으로 여기서 채워 보여 줌. 서버 값이 새로 오면 그 값으로 덮음.
 */
export const stepDisplayedHealth = (
  displayedHealth: number,
  serverHealth: number,
  hasServerUpdate: boolean,
  selfPosition: BossHudInput["selfPosition"],
  deltaSeconds: number,
): number => {
  if (hasServerUpdate) {
    return serverHealth;
  }

  if (selfPosition === null || isInCourtyard(selfPosition)) {
    return displayedHealth;
  }

  return Math.min(
    SPACE_BOSS_PLAYER.maximumHealth,
    displayedHealth + SPACE_BOSS_PLAYER.hallRegenPerSecond * deltaSeconds,
  );
};

/** 남은 시간을 `1:05:09` 나 `5:09` 로 적음. */
export const formatBossCountdown = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = String(safeSeconds % 60).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
};

/** 두 화면 값이 같은지. 같으면 상태를 안 바꿔 리렌더를 막음. */
export const isSameBossHudView = (first: BossHudView, second: BossHudView): boolean => {
  return (
    first.playerBar?.health === second.playerBar?.health &&
    first.knockoutSeconds === second.knockoutSeconds &&
    first.nextSpawnSeconds === second.nextSpawnSeconds
  );
};
