import { memo, useCallback, useState } from "react";
import { Swiper } from "swiper/react";
import { FreeMode } from "swiper/modules";
import BlockSwiperSlide from "./components/BlockSwiperSlide";
import { GENESIS_BLOCK } from "@/shared/constants/block";
import { GenesisDataModal } from "@/components";
import useStore from "@/shared/stores/store";
import "swiper/css";
import "swiper/css/free-mode";
import "./BlocksVisualizer.scss";


const BlocksVisualizer = () => {

  // region [Hooks]
  const blockData = useStore(state => state.blockData);
  const [isGenesisBlockModal, setIsGenesisBlockModal] = useState(false);
  // endregion

  // region [Privates]
  const onOpenGenesisBlockModal = useCallback(() => {
    setIsGenesisBlockModal(true);
  }, [])
  const onCloseFearAndGreedModal = useCallback(() => {
    setIsGenesisBlockModal(false);
  }, []);
  // endregion


  return (
    <>
      <GenesisDataModal isOpen={isGenesisBlockModal} onClose={onCloseFearAndGreedModal} />
      <div className="blocks-visualizer__area">
        <Swiper slidesPerView={3} spaceBetween={6} freeMode modules={[FreeMode]}
                className="blocks-visualizer__area__slider">
          <BlockSwiperSlide isUnmined />
          {blockData.map(block => (
            <BlockSwiperSlide key={block.id} {...block} />
          ))}
          <BlockSwiperSlide isGenesis {...GENESIS_BLOCK} onOpenModal={onOpenGenesisBlockModal} />
        </Swiper>
      </div>
    </>
  );
};


const MemoizedBLocksVisualizer = memo(BlocksVisualizer);
MemoizedBLocksVisualizer.displayName = "BlocksVisualizer";
BlocksVisualizer.displayName = "BlocksVisualizer";

export default MemoizedBLocksVisualizer;
