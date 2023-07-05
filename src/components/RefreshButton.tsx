import { memo } from 'react'
import Lottie, { LottieProps } from 'react-lottie-player'
import Refresh from '@/assets/refresh.json'

// Lottie Option
const defaultOptions: LottieProps = { loop: false, play: false, style: { width: '48px', height: '48px', cursor: 'pointer' } }

const RefreshButton = () => {
  const onRefresh = () => {
    window.location.reload()
  }

  return <Lottie onClick={onRefresh} {...defaultOptions} animationData={Refresh} speed={2} goTo={0} />
}

export default memo(RefreshButton)
