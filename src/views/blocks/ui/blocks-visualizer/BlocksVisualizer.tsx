"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { FreeMode } from "swiper/modules";
import { Swiper } from "swiper/react";
import type { BlockTypes } from "@/entities/block";
import { GENESIS_BLOCK, useBlockStore } from "@/entities/block";
import BlockSwiperSlide from "./components/BlockSwiperSlide";
import GenesisVideoDialog from "./components/GenesisVideoDialog";
import "swiper/css";
import "swiper/css/free-mode";

const MEMPOOL_BLOCK_SEARCH_URL = "https://mempool.space/ko/block/" as const;
const BLOCK_TIME_REFRESH_INTERVAL_IN_MILLISECONDS = 15_000;

interface BlocksVisualizerProps {
  initialBlocks: BlockTypes[];
}

const BlocksVisualizer = ({ initialBlocks }: BlocksVisualizerProps) => {
  // region [Hooks]
  const storeBlockData = useBlockStore((state) => state.blockData);
  const [isGenesisBlockModal, setIsGenesisBlockModal] = useState(false);
  const [currentTimeInMilliseconds, setCurrentTimeInMilliseconds] = useState<number | null>(null);
  /**
   * 첫 진입 때 오른쪽에서 들어올 블록과 그 순번. 서버가 내려준 목록으로 한 번만 정함.
   * 나중에 소켓으로 새로 붙는 블록은 여기 없어서 움직임 없이 바로 보임.
   */
  const [enterOrderByBlockID] = useState(
    () => new Map(initialBlocks.map((block, index) => [block.id, index])),
  );

  // 소켓이 값을 채우기 전(= 서버 렌더링 및 첫 페인트)에는 SSR 값으로 대체한다.
  const blockData = storeBlockData[0]?.height ? storeBlockData : initialBlocks;
  // endregion

  // region [Privates]
  /** 서버와 첫 렌더에는 시각을 표시하지 않고, 마운트 후 브라우저 시계로 갱신한다. */
  const startBlockClock = () => {
    const updateCurrentTime = () => {
      setCurrentTimeInMilliseconds(Date.now());
    };

    updateCurrentTime();
    const timerId = window.setInterval(
      updateCurrentTime,
      BLOCK_TIME_REFRESH_INTERVAL_IN_MILLISECONDS,
    );
    return () => window.clearInterval(timerId);
  };
  // endregion

  // region [Events]
  const onOpenGenesisBlockModal = useCallback(() => {
    setIsGenesisBlockModal(true);
  }, []);

  const onClickBlock = useCallback((blockNumber: string) => {
    window.open(MEMPOOL_BLOCK_SEARCH_URL + blockNumber);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => startBlockClock(), []);
  // endregion

  return (
    <>
      <GenesisVideoDialog open={isGenesisBlockModal} setOpen={setIsGenesisBlockModal} />
      <div className="relative">
        <Swiper
          slidesPerView={3}
          spaceBetween={6}
          freeMode
          modules={[FreeMode]}
          className="w-[calc(100%+1rem)] !-mx-2 !px-2 !py-2"
        >
          <BlockSwiperSlide isUnmined currentTimeInMilliseconds={currentTimeInMilliseconds} />
          {blockData.map((block) => (
            <BlockSwiperSlide
              key={block.id}
              {...block}
              currentTimeInMilliseconds={currentTimeInMilliseconds}
              enterOrder={enterOrderByBlockID.get(block.id)}
              onClick={onClickBlock}
            />
          ))}
          <BlockSwiperSlide
            isGenesis
            {...GENESIS_BLOCK}
            currentTimeInMilliseconds={currentTimeInMilliseconds}
            onClickGenesis={onOpenGenesisBlockModal}
          />
        </Swiper>
      </div>
    </>
  );
};

const MemoizedBlocksVisualizer = memo(BlocksVisualizer);
MemoizedBlocksVisualizer.displayName = "BlocksVisualizer";

export default MemoizedBlocksVisualizer;
