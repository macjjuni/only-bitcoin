import { memo } from 'react'
import Lottie, { type LottieProps } from 'react-lottie-player'

interface ILottie {
  option: LottieProps
  animationData?: object | undefined
  speed: number
}

const LottieItem = ({ option, animationData, speed }: ILottie) => {
  return <Lottie {...option} animationData={animationData} speed={speed} />
}

export default memo(LottieItem)
