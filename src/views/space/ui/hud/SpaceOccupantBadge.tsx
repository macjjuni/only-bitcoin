"use client";

import { Users } from "lucide-react";
import { memo, type ReactNode } from "react";
import type { SpacePresence } from "@/entities/space";
import { resolvePresenceDisplay } from "@/views/space/lib/presenceLabel";

interface SpaceOccupantBadgeProps {
  presence: SpacePresence;
}

/**
 * 좌측 상단 접속 인원 배지.
 *
 * 데스크톱 전용이다. 손가락 기기는 같은 자리에 대화 내역이 있고 그 머리줄이
 * 이미 접속 표시를 겸한다. 그래서 크기도 데스크톱에 맞춰 넉넉히 잡았다.
 *
 * 사람 아이콘을 붙인 이유는 숫자만 떼어 놓으면 `3 / 30` 이 무엇의 수인지
 * 안 읽히기 때문이다. 대화 내역 머리줄은 옆 문맥이 설명해 주지만 여기는 없다.
 *
 * 스크린리더에는 숨긴다. 좌측 하단 대화 내역이 같은 값을 `role="status"` 로
 * 이미 알리고 있어서, 여기서 또 알리면 같은 말을 두 번 읽는다.
 */
function SpaceOccupantBadge({ presence }: SpaceOccupantBadgeProps): ReactNode {
  // region [Hooks]
  const { label, dotClassName, isPulsing } = resolvePresenceDisplay(presence);
  // endregion

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex items-center gap-2.5 rounded-full bg-black/45 py-2 pl-3.5 pr-4 text-white backdrop-blur-sm [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
    >
      <span className="relative flex size-2.5 shrink-0">
        <span
          className={`size-2.5 rounded-full ${dotClassName} ${isPulsing ? "animate-pulse" : ""}`}
        />
      </span>
      <Users size={17} className="shrink-0 text-white/60" />
      <span className="text-sm font-semibold tabular-nums text-white/90">{label}</span>
    </div>
  );
}

const MemoizedSpaceOccupantBadge = memo(SpaceOccupantBadge);
MemoizedSpaceOccupantBadge.displayName = "SpaceOccupantBadge";

export default MemoizedSpaceOccupantBadge;
