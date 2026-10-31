"use client";

import Link from "next/link";
import { memo, type ReactNode } from "react";

export type SpaceFallbackReason = "unsupported" | "contextLost";

interface SpaceFallbackProps {
  reason: SpaceFallbackReason;
  onClickRetry?: () => void;
}

const FALLBACK_MESSAGES: Record<SpaceFallbackReason, { title: string; description: string }> = {
  unsupported: {
    title: "3D 스페이스를 열 수 없음",
    description:
      "이 브라우저에서 WebGL을 사용할 수 없습니다. 최신 브라우저로 다시 열거나 하드웨어 가속을 켜보세요.",
  },
  contextLost: {
    title: "3D 렌더링이 중단됨",
    description:
      "그래픽 컨텍스트가 끊겼습니다. 다른 탭의 3D 작업이 많거나 기기 메모리가 부족할 때 생깁니다.",
  },
};

function SpaceFallback({ reason, onClickRetry }: SpaceFallbackProps): ReactNode {
  // region [Templates]
  const { title, description } = FALLBACK_MESSAGES[reason];
  // endregion

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#06080e] px-6 text-center">
      <h1 className="text-lg font-bold text-white">{title}</h1>
      <p className="max-w-md text-sm leading-relaxed text-white/60">{description}</p>

      <div className="mt-2 flex items-center gap-3">
        {onClickRetry ? (
          <button
            type="button"
            onClick={onClickRetry}
            className="rounded-full bg-bitcoin px-4 py-2 text-sm font-semibold text-black"
          >
            다시 시도
          </button>
        ) : null}

        <Link
          href="/overview"
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80"
        >
          시세 대시보드로
        </Link>
      </div>
    </div>
  );
}

const MemoizedSpaceFallback = memo(SpaceFallback);
MemoizedSpaceFallback.displayName = "SpaceFallback";

export default MemoizedSpaceFallback;
