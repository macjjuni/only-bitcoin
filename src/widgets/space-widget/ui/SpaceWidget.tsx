"use client";

import { usePathname } from "next/navigation";
import { FloatingBannerButton, GroupIcon } from "@/shared/ui";
import { useSpaceOccupantCountQuery } from "../api/useSpaceOccupantCountQuery";

/** 익명 공개 채팅 버튼이 뜨던 페이지 그대로임. */
const SPACE_WIDGET_VISIBLE_PATHS = ["/", "/overview", "/blocks", "/btc2fiat", "/orange"] as const;

/**
 * 스페이스로 가는 플로팅 버튼.
 *
 * 익명 공개 채팅 위젯 자리를 이어받음. 아이콘도 그대로 써서 같은 기능으로 읽히게 했음.
 * 지금 있는 사람 수를 모서리 배지로 보여 줌. 0명이거나 조회에 실패하면 배지를 숨김.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export default function SpaceWidget() {
  // region [Hooks]
  const pathname = usePathname();
  const isVisible = SPACE_WIDGET_VISIBLE_PATHS.some((visiblePath) => visiblePath === pathname);
  const occupantCount = useSpaceOccupantCountQuery(isVisible);
  // endregion


  // region [Templates]
  const hasOccupants = occupantCount !== undefined && occupantCount > 0;
  const occupantLabel = hasOccupants ? String(occupantCount) : "";
  const widgetLabel = hasOccupants ? `스페이스로 이동, 현재 ${occupantLabel}명` : "스페이스로 이동";
  // endregion

  if (!isVisible) {
    return null;
  }

  return (
    <FloatingBannerButton href="/space" aria-label={widgetLabel} className="pointer-events-auto relative">
      <GroupIcon size={28} className="pointer-events-none text-neutral-900 dark:text-white" />
      {hasOccupants && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f7931a] px-1 text-[11px] font-bold leading-none text-white tabular-nums"
        >
          {occupantLabel}
        </span>
      )}
    </FloatingBannerButton>
  );
}
