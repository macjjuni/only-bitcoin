import { memo, useCallback, useState } from 'react'
import { Swiper } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import BlockSwiperSlide from './components/BlockSwiperSlide'
import { GENESIS_BLOCK } from '@/shared/constants/block'
// import { GenesisDataDialog } from "@/components";
import useStore from '@/shared/stores/store'
import 'swiper/css'
import 'swiper/css/free-mode'
import { GenesisVideoDialog } from '@/components'


const MEMPOOL_BLOCK_SEARCH_URL = 'https://mempool.space/ko/block/' as const


const BlocksVisualizer = () => {
  // region [Hooks]
  const blockData = useStore((state) => state.blockData)
  const [isGenesisBlockModal, setIsGenesisBlockModal] = useState(false);
  // endregion

  // region [Privates]
  const onOpenGenesisBlockModal = useCallback(() => {
    setIsGenesisBlockModal(true);
  }, []);
  // endregion

  const onOpenMempoolBlock = useCallback((blockNumber: string) => {
    window.open(MEMPOOL_BLOCK_SEARCH_URL + blockNumber)
  }, [])


  // region [Events]
  const onClickBlock = useCallback((blockNumber: string) => {
    onOpenMempoolBlock(blockNumber)
  }, [])
  // endregion

  return (
    <>
      {/* <GenesisDataDialog /> */}
      <GenesisVideoDialog open={isGenesisBlockModal} setOpen={setIsGenesisBlockModal}/>
      <div className="relative">
        <Swiper slidesPerView={3} spaceBetween={6} freeMode modules={[FreeMode]}
                className="w-[calc(100%+1rem)] !-mx-2 !px-2 !py-2">
          <BlockSwiperSlide isUnmined/>
          {blockData.map((block) => (
            <BlockSwiperSlide key={block.id} {...block} onClick={onClickBlock}/>
          ))}
          <BlockSwiperSlide isGenesis {...GENESIS_BLOCK} onClickGenesis={onOpenGenesisBlockModal} />
        </Swiper>
      </div>
    </>
  )
}

const MemoizedBlocksVisualizer = memo(BlocksVisualizer)
MemoizedBlocksVisualizer.displayName = 'BlocksVisualizer'

export default MemoizedBlocksVisualizer