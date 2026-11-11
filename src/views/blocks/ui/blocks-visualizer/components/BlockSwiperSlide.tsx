"use client";

import { dateUtil } from "kku-util";
import { memo, useCallback, useMemo } from "react";
import { SwiperSlide } from "swiper/react";
import { bytesToMB } from "@/shared/utils/number";
import { formatBlockElapsedTime } from "../../../lib/formatBlockTime";

/** 들어오는 블록 사이 간격. */
const BLOCK_ENTER_STAGGER_IN_MILLISECONDS = 70;
/**
 * 간격을 늘리는 마지막 순번. 한 화면에 3칸만 보여서 그 뒤는 같은 시점에 들어옴.
 * 끝까지 늘리면 옆으로 넘겼을 때 아직 안 나온 블록이 보임.
 */
const BLOCK_ENTER_MAX_STAGGER_ORDER = 4;

interface BlockSwiperSlideProps {
  currentTimeInMilliseconds: number | null;
  /** 첫 진입 때 오른쪽에서 들어올 순번( 0 부터 ). 없으면 움직임 없이 바로 보임. */
  enterOrder?: number;
  id?: string;
  height?: number;
  timestamp?: number;
  size?: number;
  poolName?: string;
  isUnmined?: boolean;
  isGenesis?: boolean;
  onClick?: (blockNumber: string) => void;
  onClickGenesis?: (blockNumber?: string) => void;
}

const BlockSwiperSlide = (props: BlockSwiperSlideProps) => {
  // region [Hooks]
  const {
    currentTimeInMilliseconds,
    enterOrder,
    isUnmined,
    isGenesis,
    id,
    height,
    size,
    poolName,
    timestamp,
    onClick,
    onClickGenesis,
  } = props;
  const isDefaultRender = useMemo(() => !isUnmined, [isUnmined]);
  const hasEnterMotion = enterOrder !== undefined;

  // 상태별 동적 스타일 생성
  const blockThemeClass = useMemo(() => {
    if (isGenesis) {
      return [
        "bg-gradient-to-b from-[#f5e616] to-[#ffd000] !translate-x-[64px]",
        "before:bg-[#fcee28] after:bg-[#ebde26]",
      ].join(" ");
    }
    if (isUnmined) {
      return [
        "bg-black/35 dark:bg-white/35 -translate-x-[24px] animate-mining-pulse",
        "before:bg-black/25 dark:before:bg-white/25 after:bg-black/40 dark:after:bg-white/40",
      ].join(" ");
    }
    return [
      "bg-gradient-to-b from-[#ffb152] to-bitcoin",
      "before:bg-[#ed8a13] after:bg-[#c9740e]",
    ].join(" ");
  }, [isUnmined, isGenesis]);
  // endregion

  // region [Events]
  const onClickBlock = useCallback(() => {
    if (!isGenesis && id) {
      onClick?.(id);
    } else {
      onClickGenesis?.(id);
    }
  }, [id, isGenesis, onClick, onClickGenesis]);
  // endregion

  // region [Templates]
  const timeDisplay = useMemo(() => {
    if (currentTimeInMilliseconds === null) {
      return "-";
    }
    if (isGenesis) {
      // 날짜만 씀. 시분초까지 쓰면 두 줄로 꺾여서 좁은 화면에서 블록 아래로 넘쳤음.
      return dateUtil.getFormatDate(timestamp || 0, "YYYY.MM.DD");
    }
    return formatBlockElapsedTime(timestamp, currentTimeInMilliseconds);
  }, [isGenesis, timestamp, currentTimeInMilliseconds]);
  // endregion

  return (
    /*
      폭과 간격을 CSS 로 미리 맞춰 둠. Swiper 는 JS 가 뜬 뒤에야 폭을 넣어 주는데, 그 전까지는
      기본값 100% 라 서버 HTML 에서 맨 앞 미채굴 블록이 화면 폭만큼 늘어나 보였음.
      `BlocksVisualizer` 의 slidesPerView 3 · spaceBetween 6 과 같은 값이어야 함.
    */
    <SwiperSlide className="relative !w-[calc((100%-12px)/3)] mr-[6px] pt-[20px] pr-0  pb-2 pl-[20px] cursor-pointer !-translate-x-[64px]">
      <div
        onClick={onClickBlock}
        style={
          hasEnterMotion
            ? {
                animationDelay: `${Math.min(enterOrder, BLOCK_ENTER_MAX_STAGGER_ORDER) * BLOCK_ENTER_STAGGER_IN_MILLISECONDS}ms`,
              }
            : undefined
        }
        className={[
          hasEnterMotion && "animate-block-enter motion-reduce:animate-none",
          "relative flex flex-col justify-between items-center gap-1.5 p-1.5 text-white font-bold transition-all duration-300",
          "h-[calc((100dvw-88px)/3)] layout-max:h-[calc((524px-88px)/3)] layout-max:p-2",
          isUnmined && " animate-blink-gold",
          // 3D Side (Before - Top)
          "before:content-[''] before:absolute before:-top-[20px] before:left-0 before:w-full before:h-[20px] before:origin-bottom before:skew-x-[45deg]",
          // 3D Side (After - Left)
          "after:content-[''] after:absolute after:top-0 after:-left-[20px] after:w-[20px] after:h-full after:origin-right after:skew-y-[45deg]",
          blockThemeClass,
        ].join(" ")}
      >
        {isDefaultRender && (
          <>
            <p className="font-number text-[14px] font-bold layout-max:text-xl  ">{height}</p>
            <div className="flex flex-col items-center justify-center gap-1 font-number text-[12px] leading-[1.2] layout-max:gap-2 layout-max:text-[14px]">
              <p>{isGenesis ? "285B" : `${bytesToMB(size || 0)}MB`}</p>
              <p className="w-full text-center truncate px-1">{poolName}</p>
              <p
                className={`text-center${isGenesis ? " whitespace-nowrap text-[11px] tracking-tighter layout-max:text-[14px] layout-max:tracking-normal" : ""}`}
              >
                {timeDisplay}
              </p>
            </div>
          </>
        )}
      </div>

      {isGenesis && (
        <>
          <div className="absolute top-1/2 left-[12px] -translate-y-1/2 flex items-center gap-[12px]">
            <span className="w-1 h-1 bg-current" />
            <span className="w-1 h-1 bg-current" />
            <span className="w-1 h-1 bg-current" />
          </div>
          <button
            type="button"
            className="absolute top-0 left-[64px] w-full h-full z-[1] cursor-pointer"
            onClick={onClickBlock}
            aria-label="Genesis Block Details"
          />
        </>
      )}

      {isUnmined && (
        <div
          className="absolute -top-[12px] right-2 w-[2px] h-[144px] layout-max:h-[244px]"
          style={{
            backgroundImage: `linear-gradient(to bottom, #8a8a8a 50%, transparent 50%)`,
            backgroundSize: "1px 18px",
            backgroundRepeat: "repeat-y",
          }}
        />
      )}
    </SwiperSlide>
  );
};

const MemoizedBlockSwiperSlide = memo(BlockSwiperSlide);
MemoizedBlockSwiperSlide.displayName = "BlockSwiperSlide";

export default MemoizedBlockSwiperSlide;
