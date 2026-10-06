"use client";

import { KPopover, KPopoverContent, KPopoverTrigger } from "kku-ui";
import { memo, useMemo, useState } from "react";
import { SHARE_CARD_TIMEFRAME_LIST, type ShareCardTimeframe } from "../model/shareCardTimeframe";
import { SHARE_CARD_TONE_STYLE, type ShareCardTone } from "../model/shareCardTone";

export interface BtcSurgeTimeframeSelectorProps {
  selectedTimeframe: ShareCardTimeframe;
  tone: ShareCardTone;
  /** 트리거 글자 크기. 카드마다 헤더가 달라 옆에 붙는 LIVE 뱃지 크기에 맞춘다. */
  triggerTextClassName?: string;
  onChangeTimeframe: (timeframe: ShareCardTimeframe) => void;
}

function BtcSurgeTimeframeSelector(props: BtcSurgeTimeframeSelectorProps) {
  // region [Hooks]
  const { selectedTimeframe, tone, triggerTextClassName = "text-sm", onChangeTimeframe } = props;
  const [isOpen, setIsOpen] = useState(false);

  const toneStyle = SHARE_CARD_TONE_STYLE[tone];
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
                ? toneStyle.selectedTimeframeClassName
                : "text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {timeframe}
          </button>
        );
      }),
    [selectedTimeframe, toneStyle],
  );
  // endregion

  return (
    <KPopover open={isOpen} onOpenChange={setIsOpen}>
      <KPopoverTrigger asChild>
        <button
          type="button"
          aria-label="차트 기간 선택"
          className={`flex items-center gap-1.5 px-2.5 py-1 font-bold rounded-full cursor-pointer transition-colors ${triggerTextClassName}`}
          style={{ color: toneStyle.color }}
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
