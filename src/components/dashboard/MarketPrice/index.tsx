import { useCallback, useMemo, useState } from 'react'
import { Stack } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { IoLogoUsd } from 'react-icons/io'

import { LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/atom/LottieItem'
import CountText from '@/components/atom/CountText'
import Kimchi from './components/Kimchi'
import NotKeyNotBtc from './components/NotKeyNotBtc'
import { useBearStore } from '@/store'

import { type IBtc, type MarketType, type IExRate } from '@/store/type'

// Lottie Files
import btcLottie from '@/assets/bitcoin.json'

// Lottie Option
const defaultOption: LottieProps = { loop: true }
const btcOption = { ...defaultOption, style: { width: '160px', height: '160px' } }

interface IMarketPrice {
  btc: IBtc
  market: MarketType
  isKimchi: boolean
  isLottiePlay: boolean
  exRate: IExRate
}

const defaultSpeed = 0.3

const MarketPrice = ({ btc, market, isKimchi, isLottiePlay, exRate }: IMarketPrice) => {
  const { isCountAnime, isCountColor, toggleLottie } = useBearStore((state) => state)
  const [speed, setSpeed] = useState(defaultSpeed)

  const mouseEnter = useCallback(() => {
    if (isLottiePlay) setSpeed(2)
  }, [isLottiePlay])
  const mouseLeave = useCallback(() => {
    if (isLottiePlay) setSpeed(defaultSpeed)
  }, [isLottiePlay])

  const onToggleLottie = useCallback(() => {
    toggleLottie()
  }, [])

  const getColor = useCallback(
    (color: boolean) => {
      if (!isCountColor) return ''
      if (color) return 'up'
      return 'down'
    },
    [isCountColor]
  )

  const WonIcon = useMemo(() => <FaWonSign fontSize={26} />, [])
  const DollarIcon = useMemo(() => <IoLogoUsd fontSize={27} style={{ marginRight: '-4px' }} />, [])

  return (
    <Stack className="box-item" onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} justifyContent="center" height="240px">
      <Stack flexDirection="row" justifyContent="space-between" alignItems="center" pr="8px">
        <LottieItem onClick={onToggleLottie} option={btcOption} play={isLottiePlay} animationData={btcLottie} speed={speed + 0.8} />

        <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px" position="relative" mt="24px">
          {isKimchi && <Kimchi btc={btc} exRate={exRate} isAnime={isCountAnime} />}
          {market?.includes('KRW') && (
            <Stack className={getColor(btc.krwColor)} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30} lineHeight="38px">
              {WonIcon}
              <CountText className="price-txt-lg" text={btc.krw} duration={0.2} isAnime={isCountAnime} />
            </Stack>
          )}
          {market?.includes('USD') && (
            <Stack className={getColor(btc.usdColor)} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30} lineHeight="38px">
              {DollarIcon}
              <CountText className="price-txt-lg" text={btc.usd} duration={0.2} isAnime={isCountAnime} />
            </Stack>
          )}
        </Stack>
      </Stack>
      <NotKeyNotBtc />
    </Stack>
  )
}

export default MarketPrice
