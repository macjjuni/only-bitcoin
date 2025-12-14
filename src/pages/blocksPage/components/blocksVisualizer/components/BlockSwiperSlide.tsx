import { memo, useCallback, useMemo } from "react";
import { dateUtil } from "kku-util";
import { SwiperSlide } from "swiper/react";
import { bytesToMB } from "@/shared/utils/number";
import { calcCurrentDateDifference } from "@/shared/lib/date";

interface BlockSwiperSlideProps {
  height?: number;
  timestamp?: number;
  size?: number;
  poolName?: string;
  isUnmined?: boolean;
  isGenesis?: boolean;
  onOpenModal?: () => void;
}


const BlockSwiperSlide = (props: BlockSwiperSlideProps) => {

  // region [Hooks]
  const { isUnmined, isGenesis, height, size, poolName, timestamp, onOpenModal } = props;

  const rootClass = useMemo(() => {
    const clazz = ["blocks-visualizer__area__slider__block"];
    if (isUnmined) { clazz.push("blocks-visualizer__area__slider__block--unmined"); }
    if (isGenesis) { clazz.push("blocks-visualizer__area__slider__block--genesis"); }
    return clazz.join(" ");
  }, [isUnmined, isGenesis]);

  const diffNowMin = useMemo(() => calcCurrentDateDifference(timestamp || 0, "minute"), [timestamp]);
  const isDefaultRender = useMemo(() => (!isUnmined), [isUnmined]);
  // endregion


  // region [Privates]
  const convertMinutes = useCallback((minutes: number) => {
    if (isGenesis) {
      return "-";
    }
    const hours = Math.floor(minutes / 60); // 시간 계산
    const remainingMinutes = minutes % 60;  // 남은 분 계산

    return `${hours}시간 ${remainingMinutes}분`;
  }, [isGenesis]);
  // endregion


  // region [Events]
  const onClickGenesisBlock = useCallback(() => {
    if (isGenesis) {
      onOpenModal?.();
    }
  }, [isGenesis, onOpenModal]);
  // endregion


  // region [Templates]
  const timeDisplay = useMemo(() => {
    if (isGenesis) { return dateUtil.getFormatDate(timestamp || 0, "YYYY.MM.DD HH:mm:ss"); }
    if (diffNowMin <= 0) return "조금 전";
    if (diffNowMin < 60) return `${diffNowMin}분 전`;
    return `${convertMinutes(diffNowMin)} 전`;
  }, [isGenesis, timestamp, diffNowMin]);
  // endregion


  return (
    <SwiperSlide className="blocks-visualizer__area__slider__item">
      <div className={rootClass}>
        {
          isDefaultRender && (
            <>
              <p className="block-height">{height}</p>
              <div className="block-info">
                <p className="block-size">{isGenesis ? "285B" : `${bytesToMB(size || 0)}MB`}</p>
                <p className="block-pool-name">{poolName}</p>
                <p className="block-timestamp">{timeDisplay}</p>
              </div>
            </>
          )
        }
      </div>
      {isGenesis &&
        <>
          <div className="blocks-visualizer__area__slider__item__genesis">
            <span /><span /><span />
          </div>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <button type="button" className="blocks-visualizer__area__slider__item__genesis__cover"
                  onClick={onClickGenesisBlock} />
        </>
      }
      {isUnmined && <div className="blocks-visualizer__area__slider__item__divider" />}
    </SwiperSlide>
  );
};

const MemoizedBlockSwiperSlide = memo(BlockSwiperSlide);
MemoizedBlockSwiperSlide.displayName = "BlockSwiperSlide";
BlockSwiperSlide.displayName = "BlockSwiperSlide";

export default MemoizedBlockSwiperSlide;