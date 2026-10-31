"use client";

import { memo, type ReactNode } from "react";

/** 데스크톱·모바일 조작을 함께 적는다. 기기마다 다른 안내를 띄우면 관리가 갈린다. */
const CONTROL_GUIDE = [
  { action: "이동", desktop: "W A S D", mobile: "왼쪽 화면 터치" },
  { action: "달리기", desktop: "Shift", mobile: "끝까지 밀기" },
  { action: "시야 회전", desktop: "드래그 · Q E", mobile: "오른쪽 화면 드래그" },
  { action: "줌", desktop: "휠", mobile: "두 손가락" },
] as const;

/** 조작 안내 패널. 우측 상단 버튼으로 여닫는다. */
function SpaceControlGuide(): ReactNode {
  return (
    <dl className="w-56 rounded-xl bg-black/65 px-3 py-2.5 backdrop-blur-sm">
      {CONTROL_GUIDE.map(({ action, desktop, mobile }) => (
        <div key={action} className="flex items-baseline justify-between gap-2 py-0.5">
          <dt className="shrink-0 text-[11px] font-semibold text-white/85">{action}</dt>
          <dd className="text-right text-[11px] leading-4 text-white/55">
            <span className="hidden sm:inline">{desktop}</span>
            <span className="sm:hidden">{mobile}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const MemoizedSpaceControlGuide = memo(SpaceControlGuide);
MemoizedSpaceControlGuide.displayName = "SpaceControlGuide";

export default MemoizedSpaceControlGuide;
