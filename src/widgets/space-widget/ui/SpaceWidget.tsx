"use client";

import { usePathname } from "next/navigation";
import { FloatingBannerButton, GroupIcon } from "@/shared/ui";

/** 익명 공개 채팅 버튼이 뜨던 페이지 그대로임. */
const SPACE_WIDGET_VISIBLE_PATHS = ["/", "/overview", "/blocks", "/btc2fiat", "/orange"] as const;

/**
 * 스페이스로 가는 플로팅 버튼.
 *
 * 익명 공개 채팅 위젯 자리를 이어받음. 아이콘도 그대로 써서 같은 기능으로 읽히게 했음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export default function SpaceWidget() {
  // region [Hooks]
  const pathname = usePathname();
  // endregion


  // region [Templates]
  const isVisible = SPACE_WIDGET_VISIBLE_PATHS.some((visiblePath) => visiblePath === pathname);
  // endregion

  if (!isVisible) {
    return null;
  }

  return (
    <FloatingBannerButton href="/space" aria-label="스페이스로 이동" className="pointer-events-auto">
      <GroupIcon size={28} className="pointer-events-none text-neutral-900 dark:text-white" />
    </FloatingBannerButton>
  );
}
