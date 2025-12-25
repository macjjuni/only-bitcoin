import { memo, useCallback, useState } from "react";
import { Swiper } from "swiper/react";
import { FreeMode } from "swiper/modules";
import BlockSwiperSlide from "./components/BlockSwiperSlide";
import { GENESIS_BLOCK } from "@/shared/constants/block";
import { GenesisDataDialog } from "@/components";
import useStore from "@/shared/stores/store";
import "swiper/css";
import "swiper/css/free-mode";


const BlocksVisualizer = () => {
  // region [Hooks]
  const blockData = useStore((state) => state.blockData);
  const [isGenesisBlockModal, setIsGenesisBlockModal] = useState(false);
  // endregion

  // region [Privates]
  const onOpenGenesisBlockModal = useCallback(() => {
    setIsGenesisBlockModal(true);
  }, []);

  const onChangeOpenFearAndGreedModal = useCallback((val: boolean) => {
    setIsGenesisBlockModal(val);
  }, []);
  // endregion

  return (
    <>
      <GenesisDataDialog
        open={isGenesisBlockModal}
        setOpen={onChangeOpenFearAndGreedModal}
      />
      <div className="relative">
        <Swiper slidesPerView={3} spaceBetween={6} freeMode modules={[FreeMode]}
                className="w-[calc(100%+1rem)] !-mx-2 !px-2 !py-2">
          <BlockSwiperSlide isUnmined />
          {blockData.map((block) => <BlockSwiperSlide key={block.id} {...block} />)}
          <BlockSwiperSlide isGenesis {...GENESIS_BLOCK} onOpenModal={onOpenGenesisBlockModal} />
        </Swiper>
      </div>
    </>
  );
};

const MemoizedBlocksVisualizer = memo(BlocksVisualizer);
MemoizedBlocksVisualizer.displayName = "BlocksVisualizer";

export default MemoizedBlocksVisualizer;