import { memo, UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KIcon } from "kku-ui";
import useStore from "@/shared/stores/store";
import { calcCurrentDateDifference } from "@/shared/lib/date";
import { bytesToMB } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import "./BlocksVisualizer.scss";


const BLOCK_SEARCH_URL = "https://mempool.space/ko/block/";
const VERTICAL_LINE_LEFT = 56;

const BlocksVisualizer = () => {

  // region [Hooks]

  const listRef = useRef<HTMLDivElement>(null);
  const verticalLineRef = useRef<HTMLDivElement>(null);

  const timeoutRef = useRef<number | null>(null);

  const [renderTrigger, setRenderTrigger] = useState<number>(0);
  const blockData = useStore(state => state.blockData);

  // endregion


  // region [Styles]


  // endregion


  // region [Privates]

  const initializeListClass = useCallback(() => {
    listRef.current?.classList.remove("add-block");
    setTimeout(() => {
      listRef.current?.classList.add("add-block");
    }, 0);
  }, []);

  const convertMinutes = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60); // 시간 계산
    const remainingMinutes = minutes % 60;  // 남은 분 계산

    return `${hours}시간 ${remainingMinutes}분`;
  }, []);

  const dateUpdater = useCallback(() => {
    setInterval(() => {
      setRenderTrigger((prev) => prev + 1);
    }, 5 * 1000); // 3초 (60,000ms)
  }, []);

  // endregion


  // region [Events]

  const onScrollTopArea = useCallback((e: UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = e.currentTarget; // 가로 스크롤 위치
    verticalLineRef.current?.style.setProperty("left", `${VERTICAL_LINE_LEFT - scrollLeft}px`);
  }, []);

  // endregion


  // region [Templates]

  const BlockSquareList = useMemo(() => (

    blockData?.map(block => {

      const diffNowMin = calcCurrentDateDifference(block.timestamp, "minute");

      return (
        <div className="block__square__area" key={block.height}>
          <div className="block__square__area__height">
            <KIcon icon="stack" color="#fff" size={14} />
            {comma(block.height)}
          </div>
          <div className="block__square__area__size">
            <KIcon icon="data" color="#fff" size={14} />
            {bytesToMB(block.size)}MB
          </div>
          <div className="block__square__area__pool-name">
            <KIcon icon="miner" color="#fff" size={14} />
            {block.poolName}</div>
          <div className="block__square__area__date">
            <KIcon icon="confirm" color="#fff" size={14} />
            {diffNowMin <= 0 && "조금 전"}
            {diffNowMin !== 0 && diffNowMin < 60 && `${diffNowMin}분 전`}
            {diffNowMin !== 0 && diffNowMin >= 60 && `${convertMinutes(diffNowMin)} 전`}
          </div>
          <a className="block__square__area__link" href={BLOCK_SEARCH_URL + block.id} target="_blank" rel="noreferrer">
            <KIcon icon="open" color="#fff" size={18} />
          </a>
        </div>
      );
    })), [blockData, renderTrigger]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    dateUpdater();

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    initializeListClass();
  }, [blockData]);

  // endregion


  return (
    <div className="blocks-visualizer__area">
      <div ref={verticalLineRef} className="vertical-line" />
      <div ref={listRef} className="blocks-visualizer__area__top" onScroll={onScrollTopArea}>
        <div className="block__square__area unmined-block" />
        {BlockSquareList}
      </div>
    </div>
  );
};

export default memo(BlocksVisualizer);
