import { memo, useCallback, useMemo } from "react";
import { dateUtil } from "kku-util";
import { SwiperSlide } from "swiper/react";
import { bytesToMB } from "@/shared/utils/number";
import { calcCurrentDateDifference } from "@/shared/lib/date";

interface BlockSwiperSlideProps {
  id?: string;
  height?: number;
  timestamp?: number;
  size?: number;
  poolName?: string;
  isUnmined?: boolean;
  isGenesis?: boolean;
  onClick?: (blockNumber: string) => void;
}

const BlockSwiperSlide = (props: BlockSwiperSlideProps) => {
  // region [Hooks]
  const { isUnmined, isGenesis, id, height, size, poolName, timestamp, onClick } = props;

  const diffNowMin = useMemo(() => calcCurrentDateDifference(timestamp || 0, "minute"), [timestamp]);
  const isDefaultRender = useMemo(() => !isUnmined, [isUnmined]);

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
      "bg-gradient-to-b from-[#ffb152] to-[#F7931A]",
      "before:bg-[#ed8a13] after:bg-[#c9740e]",
    ].join(" ");
  }, [isUnmined, isGenesis]);
  // endregion

  // region [Privates]
  const convertMinutes = useCallback(
    (minutes: number) => {
      if (isGenesis) return "-";
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}시간 ${remainingMinutes}분`;
    },
    [isGenesis]
  );
  // endregion

  // region [Events]
  const onClickBlock = useCallback(() => {
    if (!isGenesis && id) {
      onClick?.(id);
    }
  }, [id, isGenesis, onClick]);
  // endregion

  // region [Templates]
  const timeDisplay = useMemo(() => {
    if (isGenesis) {
      return dateUtil.getFormatDate(timestamp || 0, "YYYY.MM.DD HH:mm:ss");
    }
    if (diffNowMin <= 0) return "조금 전";
    if (diffNowMin < 60) return `${diffNowMin}분 전`;
    return `${convertMinutes(diffNowMin)} 전`;
  }, [isGenesis, timestamp, diffNowMin, convertMinutes]);
  // endregion

  return (
    <SwiperSlide className="relative pt-[20px] pr-0  pb-2 pl-[20px] !-translate-x-[64px]">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <div
        onClick={onClickBlock}
        className={[
          "relative flex flex-col justify-between items-center gap-1.5 p-1.5 text-white font-bold transition-all duration-300",
          "h-[calc((100dvw-88px)/3)] layout-max:h-[calc((524px-88px)/3)] layout-max:p-2",
          isUnmined && ' animate-blink-gold',
          // 3D Side (Before - Top)
          "before:content-[''] before:absolute before:-top-[20px] before:left-0 before:w-full before:h-[20px] before:origin-bottom before:skew-x-[45deg]",
          // 3D Side (After - Left)
          "after:content-[''] after:absolute after:top-0 after:-left-[20px] after:w-[20px] after:h-full after:origin-right after:skew-y-[45deg]",
          blockThemeClass,
        ].join(" ")}
      >
        {isDefaultRender && (
          <>
            <p className="font-number text-[14px] font-bold layout-max:text-[18px]">
              {height}
            </p>
            <div className="flex flex-col items-center justify-center gap-1 font-number text-[12px] leading-[1.2] layout-max:gap-2 layout-max:text-[14px]">
              <p>{isGenesis ? "285B" : `${bytesToMB(size || 0)}MB`}</p>
              <p className="w-full text-center truncate px-1">{poolName}</p>
              <p className="text-center">{timeDisplay}</p>
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
            backgroundSize: '1px 18px',
            backgroundRepeat: 'repeat-y'
          }}
        />
      )}
    </SwiperSlide>
  );
};

const MemoizedBlockSwiperSlide = memo(BlockSwiperSlide);
MemoizedBlockSwiperSlide.displayName = "BlockSwiperSlide";

export default MemoizedBlockSwiperSlide;