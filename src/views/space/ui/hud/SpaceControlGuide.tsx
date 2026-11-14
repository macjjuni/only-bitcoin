"use client";

import { memo, type ReactNode } from "react";

/** 데스크톱·모바일 조작을 같이 적음. 기기마다 다른 안내를 띄우면 관리가 갈림. */
const CONTROL_GUIDE = [
  { action: "이동", desktop: "W A S D", mobile: "조이스틱" },
  { action: "달리기", desktop: "Shift", mobile: "끝까지 밀기" },
  { action: "점프", desktop: "Space", mobile: "공격 위 버튼" },
  { action: "공격", desktop: "클릭 · F", mobile: "우측 하단 버튼" },
  { action: "시야 회전", desktop: "드래그 · Q E", mobile: "화면 드래그" },
  { action: "줌", desktop: "휠", mobile: "두 손가락" },
  { action: "채팅", desktop: "Enter", mobile: "좌측 하단 버튼" },
] as const;

interface SpaceControlGuideProps {
  /** 손가락 기기인지. 화면 폭으로 가르면 가로 폰·태블릿에 키보드 안내가 뜸. */
  isCoarsePointer: boolean;
  /** 계측 패널(FPS · 서버 왕복 시간)을 켜 뒀는지. */
  isPerformanceStatsEnabled: boolean;
  onTogglePerformanceStats: () => void;
}

/**
 * 조작 안내 패널. 우측 상단 버튼으로 여닫는다.
 *
 * 맨 아래에 "성능 표시" 스위치가 있음. 안내는 읽기 전용이라 터치를 흘려보내고(열어 둔 동안에도
 * 그 자리에서 시야를 돌릴 수 있게), 스위치 한 줄만 터치를 받음.
 */
function SpaceControlGuide({
  isCoarsePointer,
  isPerformanceStatsEnabled,
  onTogglePerformanceStats,
}: SpaceControlGuideProps): ReactNode {
  return (
    <div className="w-56 rounded-xl bg-black/65 px-3 py-2.5 backdrop-blur-sm">
      <dl>
        {CONTROL_GUIDE.map(({ action, desktop, mobile }) => (
          <div key={action} className="flex items-baseline justify-between gap-2 py-0.5">
            <dt className="shrink-0 text-[11px] font-semibold text-white/85">{action}</dt>
            <dd className="text-right text-[11px] leading-4 text-white/55">
              {isCoarsePointer ? mobile : desktop}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        role="switch"
        aria-checked={isPerformanceStatsEnabled}
        onClick={onTogglePerformanceStats}
        className="pointer-events-auto mt-2 flex w-full items-center justify-between gap-2 border-t border-white/10 pt-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bitcoin"
      >
        <span className="text-[11px] font-semibold text-white/85">성능 표시</span>
        <span
          aria-hidden="true"
          className={`flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors ${isPerformanceStatsEnabled ? "bg-bitcoin" : "bg-white/20"}`}
        >
          <span
            className={`size-3 rounded-full bg-white transition-transform ${isPerformanceStatsEnabled ? "translate-x-3" : ""}`}
          />
        </span>
      </button>
    </div>
  );
}

const MemoizedSpaceControlGuide = memo(SpaceControlGuide);
MemoizedSpaceControlGuide.displayName = "SpaceControlGuide";

export default MemoizedSpaceControlGuide;
