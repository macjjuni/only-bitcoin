"use client";

import { KPopover, KPopoverContent, KPopoverTrigger } from "kku-ui";
import { memo, useMemo, useState } from "react";
import { SHARE_CARD_TIMEFRAME_LIST, type ShareCardTimeframe } from "../model/shareCardTimeframe";

export interface BtcSurgeTimeframeSelectorProps {
  selectedTimeframe: ShareCardTimeframe;
  isUp: boolean;
  onChangeTimeframe: (timeframe: ShareCardTimeframe) => void;
}

function BtcSurgeTimeframeSelector(props: BtcSurgeTimeframeSelectorProps) {
  // region [Hooks]
  const { selectedTimeframe, isUp, onChangeTimeframe } = props;
  const [isOpen, setIsOpen] = useState(false);

  const themeColor = isUp ? "#00E676" : "#FF5252";
  // endregion

  // region [Events]
  const onClickTimeframeItem = (timeframe: ShareCardTimeframe) => {
    onChangeTimeframe(timeframe);
    setIsOpen(false);
  };
  // endregion

  // region [Templates]
  const TimeframeItemListTemplate = useMemo(
    () =>
      SHARE_CARD_TIMEFRAME_LIST.map((timeframe) => {
        const isSelected = timeframe === selectedTimeframe;

        return (
          <button
            key={timeframe}
            type="button"
            onClick={() => onClickTimeframeItem(timeframe)}
            className={`p-2 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer whitespace-nowrap ${
              isSelected
                ? isUp
                  ? "bg-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]"
                  : "bg-[#FF5252] text-white shadow-[0_0_12px_rgba(255,82,82,0.4)]"
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {timeframe}
          </button>
        );
      }),
    [selectedTimeframe, isUp],
  );
  // endregion

  return (
    <KPopover open={isOpen} onOpenChange={setIsOpen}>
      <KPopoverTrigger asChild>
        <button
          type="button"
          aria-label="차트 기간 선택"
          className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-bold rounded-full cursor-pointer transition-colors"
          style={{ color: themeColor }}
        >
          {selectedTimeframe}
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </KPopoverTrigger>

      <KPopoverContent
        align="end"
        side="bottom"
        sideOffset={16}
        alignOffset={-4}
        className="!bg-[#111318]/95 !border-white/15 !backdrop-blur-xl !shadow-[0_8px_32px_rgba(0,0,0,0.6)] !rounded-2xl !p-2"
      >
        <div className="grid grid-cols-5 gap-1">{TimeframeItemListTemplate}</div>
      </KPopoverContent>
    </KPopover>
  );
}

const MemoizedBtcSurgeTimeframeSelector = memo(BtcSurgeTimeframeSelector);
MemoizedBtcSurgeTimeframeSelector.displayName = "BtcSurgeTimeframeSelector";

export default MemoizedBtcSurgeTimeframeSelector;
