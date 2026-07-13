"use client";

import { memo, useCallback, useState } from "react";
import { FreeMode } from "swiper/modules";
import { Swiper } from "swiper/react";
import type { BlockTypes } from "@/entities/block";
import { GENESIS_BLOCK, useBlockStore } from "@/entities/block";
import BlockSwiperSlide from "./components/BlockSwiperSlide";
import GenesisVideoDialog from "./components/GenesisVideoDialog";
import "swiper/css";
import "swiper/css/free-mode";

const MEMPOOL_BLOCK_SEARCH_URL = "https://mempool.space/ko/block/" as const;

interface BlocksVisualizerProps {
  /** SSR 로 미리 조회한 블록 목록. 소켓이 붙기 전까지의 표시값이자 크롤러가 읽는 값이다. */
  initialBlocks: BlockTypes[];
}

const BlocksVisualizer = ({ initialBlocks }: BlocksVisualizerProps) => {
  // region [Hooks]
  const storeBlockData = useBlockStore((state) => state.blockData);
  const [isGenesisBlockModal, setIsGenesisBlockModal] = useState(false);

  // 소켓이 값을 채우기 전(= 서버 렌더링 및 첫 페인트)에는 SSR 값으로 대체한다.
  const blockData = storeBlockData[0]?.height ? storeBlockData : initialBlocks;
  // endregion

  // region [Privates]
  const onOpenGenesisBlockModal = useCallback(() => {
    setIsGenesisBlockModal(true);
  }, []);
  // endregion

  const onOpenMempoolBlock = useCallback((blockNumber: string) => {
    window.open(MEMPOOL_BLOCK_SEARCH_URL + blockNumber);
  }, []);

  // region [Events]
  const onClickBlock = useCallback((blockNumber: string) => {
    onOpenMempoolBlock(blockNumber);
  }, []);
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
          <BlockSwiperSlide isUnmined />
          {blockData.map((block) => (
            <BlockSwiperSlide key={block.id} {...block} onClick={onClickBlock} />
          ))}
          <BlockSwiperSlide isGenesis {...GENESIS_BLOCK} onClickGenesis={onOpenGenesisBlockModal} />
        </Swiper>
      </div>
    </>
  );
};

const MemoizedBlocksVisualizer = memo(BlocksVisualizer);
MemoizedBlocksVisualizer.displayName = "BlocksVisualizer";

export default MemoizedBlocksVisualizer;
