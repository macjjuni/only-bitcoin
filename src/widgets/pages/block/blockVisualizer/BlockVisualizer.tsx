import { memo, useCallback, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { calcCurrentDateDifference } from "@/shared/utils/date";
import { bytesToMB } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { ConfirmIcon, DetailIcon, HeightIcon, MinerIcon, SizeIcon } from "@/shared/icons";
import "./BlockVisualizer.scss";


const BLOCK_SEARCH_URL = "https://mempool.space/ko/block/";


const BlockVisualizer = () => {

  // region [Hooks]

  const blockData = useStore(state => state.blockData);

  // endregion


  // region [Pravates]

  const convertMinutes = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60); // 시간 계산
    const remainingMinutes = minutes % 60;  // 남은 분 계산

    return `${hours}시간 ${remainingMinutes}분`;
  }, []);

  // endregion


  // region [Templates]

  const BlockSquareList = useMemo(() => (
    blockData.map(block => {

      const diffNowMin = calcCurrentDateDifference(block.timestamp, "minute");

      return (
        <div className="block__square__area" key={block.height}>
          <div className="block__square__area__height">
            <HeightIcon size={18} />
            {comma(block.height)}
          </div>
          <div className="block__square__area__size">
            <SizeIcon size={18} />
            {bytesToMB(block.size)}MB
          </div>
          <div className="block__square__area__pool-name">
            <MinerIcon size={18} />
            {block.poolName}</div>
          <div className="block__square__area__date">
            <ConfirmIcon size={18} />
            {diffNowMin >= 60 ? convertMinutes(diffNowMin) : `${diffNowMin}분`} 전
          </div>
          <a className="block__square__area__link" href={BLOCK_SEARCH_URL + block.id} target="_blank" rel="noreferrer">
            <DetailIcon color="#fff" />
          </a>
        </div>
      );
    })), [blockData]);

  // endregion


  return (
    <div className="block-visualizer__area">
      <div className="block-visualizer__area__top">
        <div className="block__square__area unmined-block">
          <div className="block__square__area__height">
            <HeightIcon size={18} />
            {blockData[0].height + 1}
          </div>
        </div>
        {BlockSquareList}
      </div>
    </div>
  );
};

export default memo(BlockVisualizer);
