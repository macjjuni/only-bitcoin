"use client";

import { RectangleHorizontal, Square } from "lucide-react";
import { memo } from "react";
import { SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import {
  SHARE_CARD_LAYOUT_LABEL,
  SHARE_CARD_LAYOUT_LIST,
  type ShareCardLayout,
} from "../model/shareCardLayout";

const LAYOUT_ICON: Record<ShareCardLayout, typeof Square> = {
  square: Square,
  wide: RectangleHorizontal,
};

const LAYOUT_OPTION_LIST: Array<SegmentedControlOption<ShareCardLayout>> =
  SHARE_CARD_LAYOUT_LIST.map((layout) => {
    const LayoutIcon = LAYOUT_ICON[layout];

    return {
      value: layout,
      label: (
        <span className="flex items-center justify-center gap-1.5">
          <LayoutIcon size={14} />
          {SHARE_CARD_LAYOUT_LABEL[layout]}
        </span>
      ),
      activeClassName: "bg-bitcoin !text-white",
    };
  });

export interface BtcSurgeLayoutSelectorProps {
  selectedLayout: ShareCardLayout;
  onChangeLayout: (layout: ShareCardLayout) => void;
}

/**
 * 공유 카드 레이아웃 전환 컨트롤.
 *
 * 다이얼로그 헤더에 놓이므로 항상 어두운 오버레이 위에 뜬다. 테마와 무관하게 어두운 배경을
 * 강제해야 라이트 모드에서 밝은 칩이 오버레이에 묻히지 않는다.
 */
function BtcSurgeLayoutSelector({ selectedLayout, onChangeLayout }: BtcSurgeLayoutSelectorProps) {
  return (
    <SegmentedControl
      options={LAYOUT_OPTION_LIST}
      value={selectedLayout}
      onChange={onChangeLayout}
      size="sm"
      className="!bg-neutral-800/80 border border-neutral-700/50 backdrop-blur-sm [&_button]:text-neutral-300"
    />
  );
}

const MemoizedBtcSurgeLayoutSelector = memo(BtcSurgeLayoutSelector);
MemoizedBtcSurgeLayoutSelector.displayName = "BtcSurgeLayoutSelector";

export default MemoizedBtcSurgeLayoutSelector;
