import { memo, useState, useEffect } from 'react'
import Lottie, { LottieProps } from 'react-lottie-player'
import Refresh from '@/assets/refresh.json'
import { reConnect as upbitReconnect } from '@/socket/upbit'
import { reConnect as binanceReconnect } from '@/socket/binance'

// Lottie Option
const defaultOptions: LottieProps = { loop: false, style: { width: '48px', height: '48px', cursor: 'pointer' } }

const RefreshButton = () => {
  const [play, setPlay] = useState(false)

  const disconect = () => {
    upbitReconnect()
    binanceReconnect()
  }

  const onRefresh = () => {
    disconect()
    setPlay(true)
  }

  useEffect(() => {
    if (play === true)
      setTimeout(() => {
        setPlay(false)
      }, 600)
  }, [play])

  return <Lottie onClick={onRefresh} {...defaultOptions} play={play} animationData={Refresh} speed={2} goTo={0} />
}

export default memo(RefreshButton)
