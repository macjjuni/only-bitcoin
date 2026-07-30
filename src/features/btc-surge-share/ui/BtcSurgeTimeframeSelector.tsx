"use client";

import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
} from "kku-ui";
import { memo, useMemo } from "react";
import {
  getVisibleTimeframeWindow,
  SHARE_CARD_TIMEFRAME_LIST,
  type ShareCardTimeframe,
} from "../model/shareCardTimeframe";

export interface BtcSurgeTimeframeSelectorProps {
  selectedTimeframe: ShareCardTimeframe;
  /** 카드 상승/하락 테마. 선택된 항목 배경색을 결정한다. */
  isUp: boolean;
  onChangeTimeframe: (timeframe: ShareCardTimeframe) => void;
}

/**
 * 폭을 고정해 노출 중인 타임프레임 조합( `10Y` 등 3글자 포함 )과 무관하게
 * 뱃지 그룹 전체 폭을 일정하게 유지한다. 카드 헤더가 로고와 한 줄을 나눠 쓰므로
 * 폭이 늘어나면 헤더가 밀리거나 잘릴 수 있다.
 */
const TIMEFRAME_ITEM_BASE_CLASS_NAME =
  "w-[34px] py-1 text-sm font-bold text-center whitespace-nowrap flex-shrink-0 rounded-full transition-colors";

/**
 * 카드 상단의 타임프레임 선택 컨트롤.
 *
 * 카드 가로 폭이 고정( 440px )이라 3개까지만 노출할 수 있으므로, 선택된 타임프레임 기준
 * 좌우 한 칸씩만 보여주고 전체 목록은 드롭다운 메뉴로 제공한다.
 * 노출된 3개는 현재 위치를 나타내는 표시 전용이며( 이벤트 없음 ), 기간 변경은 항상 메뉴에서 한다.
 */
function BtcSurgeTimeframeSelector(props: BtcSurgeTimeframeSelectorProps) {
  // region [Hooks]
  const { selectedTimeframe, isUp, onChangeTimeframe } = props;

  const visibleTimeframes = useMemo(
    () => getVisibleTimeframeWindow(selectedTimeframe),
    [selectedTimeframe],
  );
  // endregion

  // region [Privates]
  /**
   * 선택 여부와 상승/하락 테마에 따른 타임프레임 항목 클래스 조합
   */
  const getTimeframeItemClassName = (isSelectedTimeframe: boolean) => {
    if (!isSelectedTimeframe) {
      return `${TIMEFRAME_ITEM_BASE_CLASS_NAME} text-neutral-400 group-hover:text-neutral-200`;
    }

    if (isUp) {
      return `${TIMEFRAME_ITEM_BASE_CLASS_NAME} bg-[#00E676] text-black shadow-md`;
    }

    return `${TIMEFRAME_ITEM_BASE_CLASS_NAME} bg-[#FF5252] text-white shadow-md`;
  };
  // endregion

  // region [Events]
  const onCheckedChangeTimeframeMenuItem = (timeframe: ShareCardTimeframe) => {
    onChangeTimeframe(timeframe);
  };
  // endregion

  // region [Templates]
  const TimeframeItemListTemplate = useMemo(
    () =>
      visibleTimeframes.map((timeframe) => (
        <span
          key={timeframe}
          className={getTimeframeItemClassName(timeframe === selectedTimeframe)}
        >
          {timeframe}
        </span>
      )),
    [visibleTimeframes, selectedTimeframe, isUp],
  );
  // endregion

  return (
    <KDropdownMenu size="md">
      {/* 3개 항목을 감싼 랩퍼 전체가 단일 트리거다. */}
      <KDropdownMenuTrigger id="BtcSurgeTimeframeSelectorTrigger" asChild>
        <button
          type="button"
          aria-label="차트 기간 선택"
          className="group flex items-center gap-1 cursor-pointer"
        >
          {TimeframeItemListTemplate}
        </button>
      </KDropdownMenuTrigger>

      <KDropdownMenuContent align="end" side="bottom" sideOffset={12}>
        <KDropdownMenuLabel>기간 선택</KDropdownMenuLabel>
        {SHARE_CARD_TIMEFRAME_LIST.map((timeframe) => (
          <KDropdownMenuCheckboxItem
            key={timeframe}
            checked={timeframe === selectedTimeframe}
            onCheckedChange={() => onCheckedChangeTimeframeMenuItem(timeframe)}
          >
            {timeframe}
          </KDropdownMenuCheckboxItem>
        ))}
      </KDropdownMenuContent>
    </KDropdownMenu>
  );
}

const MemoizedBtcSurgeTimeframeSelector = memo(BtcSurgeTimeframeSelector);
MemoizedBtcSurgeTimeframeSelector.displayName = "BtcSurgeTimeframeSelector";

export { MemoizedBtcSurgeTimeframeSelector as BtcSurgeTimeframeSelector };
export default MemoizedBtcSurgeTimeframeSelector;
