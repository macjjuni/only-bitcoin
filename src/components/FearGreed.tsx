import { memo, useState } from 'react'
import { LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/LottieItem'
import meter from '@/assets/meter.json'
import FearGreedDialog from '@/components/modal/FearGreedDialog'
import { useBearStore } from '@/zustand/store'
import ChipItem from './Chip'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '48px', height: '48px' } }

const FearGreed = () => {
  const isFearGreed = useBearStore((state) => state.isFearGreed)
  const [isModal, setModal] = useState(false)

  const openFearGreed = () => {
    setModal(true)
  }

  if (isFearGreed)
    // 공포 탐욕지수 사진 유형
    return (
      <>
        <button type="button" className="fear-greed-btn" onClick={openFearGreed}>
          <div className="fear-greed-lottie">
            <LottieItem option={lottieOption} animationData={meter} speed={0.4} />
          </div>
        </button>
        <FearGreedDialog open={isModal} setOpen={setModal} />
      </>
    )
  // 공포 탐욕지수 텍스트 유형
  else
    return (
      <>
        <ChipItem label="F&G" value="51" />
      </>
    )
}

export default memo(FearGreed)
