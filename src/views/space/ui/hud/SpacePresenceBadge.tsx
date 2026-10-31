"use client";

import { memo, type ReactNode } from "react";
import type { SpacePresence } from "@/entities/space";
import { resolvePresenceDisplay } from "@/views/space/lib/presenceLabel";

interface SpacePresenceBadgeProps {
  presence: SpacePresence;
}

/** 좌측 상단 접속 표시. */
function SpacePresenceBadge({ presence }: SpacePresenceBadgeProps): ReactNode {
  // region [Templates]
  const { label, accessibleLabel, dotClassName, isPulsing } = resolvePresenceDisplay(presence);
  const dotAnimationClassName = isPulsing ? "animate-pulse" : "";
  // endregion

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-sm"
      role="status"
      aria-label={accessibleLabel}
    >
      <span className={`size-2 shrink-0 rounded-full ${dotClassName} ${dotAnimationClassName}`} />
      <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-white/90">
        {label}
      </span>
    </div>
  );
}

const MemoizedSpacePresenceBadge = memo(SpacePresenceBadge);
MemoizedSpacePresenceBadge.displayName = "SpacePresenceBadge";

export default MemoizedSpacePresenceBadge;
