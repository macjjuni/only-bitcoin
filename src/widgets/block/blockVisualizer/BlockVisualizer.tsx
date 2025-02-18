import { memo, useCallback, useMemo } from "react";
import useStore from "@/shared/stores/store";
import "./BlockVisualizer.scss";
import { calcCurrentDateDifference, formatDate } from "@/shared/utils/date";
import { bytesToMB } from "@/shared/utils/number";

const BLOCK_SEARCH_URL = "https://mempool.space/ko/block/";
const BLOCK_PAGE_DATE_FORMAT = "YY.MM.DD HH:mm:ss";


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
          <span className="block__square__area__height">높이: {block.height}</span>
          <span className="block__square__area__size">크기: {bytesToMB(block.size)} MB</span>
          <span className="block__square__area__pool-name">채굴자: {block.poolName}</span>
          <span className="block__square__area__date">
            {diffNowMin >= 60 ? convertMinutes(diffNowMin) : `${diffNowMin}분`} 전
          </span>
          <a href={BLOCK_SEARCH_URL + block.id} target="_blank" rel="noreferrer">이동</a>
        </div>
      );
    })), [blockData]);

  // endregion


  return (
    <div className="block-visualizer__area">
      <div className="block-visualizer__area__top">

        <div className="block__square__area unmined-block">
          <span className="block__square__area__height">높이: {blockData[0].height + 1}</span>
        </div>

        {BlockSquareList}
      </div>
    </div>
  );
};

export default memo(BlockVisualizer);
