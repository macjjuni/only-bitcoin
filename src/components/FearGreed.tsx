import { memo, useState } from 'react'
import { LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/LottieItem'
import meter from '@/assets/meter.json'
import FearGreedDialog from '@/components/modal/FearGreedDialog'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '48px', height: '48px' } }

const FearGreed = () => {
  const [isFearGreed, setFearGreed] = useState(false)

  const openFearGreed = () => {
    setFearGreed(true)
  }

  return (
    <>
      <button type="button" className="fear-greed-btn" onClick={openFearGreed}>
        <div className="fear-greed-lottie">
          <LottieItem option={lottieOption} animationData={meter} speed={0.4} />
        </div>
      </button>
      <FearGreedDialog open={isFearGreed} setOpen={setFearGreed} />
    </>
  )
}

export default memo(FearGreed)
