"use client";

import { useProgress } from "@react-three/drei";
import { memo, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  isSpaceLoadingComplete,
  resolveSpaceLoadingPercent,
  SPACE_LOADING,
  type SpaceLoadStageStatus,
  type SpaceLoadStages,
} from "@/views/space/lib/spaceLoading";

interface SpaceLoadingOverlayProps {
  stages: SpaceLoadStages;
  isHardTimedOut: boolean;
}

interface StageRow {
  key: keyof SpaceLoadStages;
  label: string;
}

const STAGE_ROWS: readonly StageRow[] = [
  { key: "map", label: "맵 불러오는 중" },
  { key: "avatar", label: "캐릭터 준비 중" },
  { key: "server", label: "서버 접속 중" },
];

const STAGE_STATUS_TEXT: Record<SpaceLoadStageStatus, string> = {
  pending: "",
  done: "완료",
  failed: "오프라인",
  skipped: "건너뜀",
};

const STAGE_STATUS_CLASS_NAME: Record<SpaceLoadStageStatus, string> = {
  pending: "text-white/40",
  done: "text-bitcoin",
  failed: "text-white/50",
  skipped: "text-white/50",
};

/**
 * 입장 로딩 오버레이.
 *
 * 캔버스 위에 덮어 맵·캐릭터·서버 접속을 기다림. 캔버스는 뒤에서 이미 그리고
 * 있어서 걷히는 순간 바로 걸을 수 있음. 다운로드 진행률은 drei `useProgress`
 * 가 three 기본 로딩 매니저에서 읽음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceLoadingOverlay({ stages, isHardTimedOut }: SpaceLoadingOverlayProps): ReactNode {
  // region [Hooks]
  const { progress: assetPercent } = useProgress();
  const [isFadedOut, setIsFadedOut] = useState<boolean>(false);
  /**
   * 처음 끝난 순간의 단계 스냅숏.
   *
   * 한 번 끝나면 다시 열지 않음. 소켓은 에러 뒤 재접속하며 에러를 지워서 서버
   * 단계가 `failed → pending` 으로 되돌아감. 그대로 따르면 오버레이가 두 번 뜸.
   */
  const [completedStages, setCompletedStages] = useState<SpaceLoadStages | null>(null);
  const isComplete = completedStages !== null;
  const displayedStages = completedStages ?? stages;
  // endregion


  // region [Privates]
  const latchCompletedStages = (): void => {
    setCompletedStages(stages);
  };

  /** 페이드가 끝나면 DOM 에서 뺌. 투명한 채로 남으면 포커스·스크린리더에 걸림. */
  const scheduleFadeOut = (): (() => void) => {
    const fadeTimeoutId = window.setTimeout(() => {
      setIsFadedOut(true);
    }, SPACE_LOADING.fadeOutInMilliseconds);

    return () => {
      window.clearTimeout(fadeTimeoutId);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    if (!isComplete && isSpaceLoadingComplete(stages, isHardTimedOut)) {
      latchCompletedStages();
    }
  }, [isComplete, stages, isHardTimedOut]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    return scheduleFadeOut();
  }, [isComplete]);
  // endregion


  // region [Templates]
  const loadingPercent = useMemo(() => {
    return isComplete ? 100 : resolveSpaceLoadingPercent(stages, assetPercent);
  }, [isComplete, stages, assetPercent]);

  const StageListTemplate = useMemo(() => {
    return STAGE_ROWS.map(({ key, label }) => {
      const status = displayedStages[key];

      return (
        <li key={key} className="flex items-center justify-between gap-6 text-xs">
          <span className={status === "pending" ? "text-white/80" : "text-white/40"}>{label}</span>
          <span className={`font-semibold tabular-nums ${STAGE_STATUS_CLASS_NAME[status]}`}>
            {status === "pending" ? (
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-white/60" />
            ) : (
              STAGE_STATUS_TEXT[status]
            )}
          </span>
        </li>
      );
    });
  }, [displayedStages]);

  if (isFadedOut) {
    return null;
  }
  // endregion

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`BTC 스페이스 입장 준비 ${loadingPercent}%`}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#06080e] transition-opacity ${isComplete ? "pointer-events-none opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${SPACE_LOADING.fadeOutInMilliseconds}ms` }}
    >
      <div className="flex w-56 flex-col gap-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold text-white">BTC Space</span>
          <span className="text-xs font-semibold tabular-nums text-white/60">
            {loadingPercent}%
          </span>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-bitcoin transition-[width] duration-300 ease-out"
            style={{ width: `${loadingPercent}%` }}
          />
        </div>

        <ul className="flex flex-col gap-1.5">{StageListTemplate}</ul>
      </div>
    </div>
  );
}

const MemoizedSpaceLoadingOverlay = memo(SpaceLoadingOverlay);
MemoizedSpaceLoadingOverlay.displayName = "SpaceLoadingOverlay";

export default MemoizedSpaceLoadingOverlay;
