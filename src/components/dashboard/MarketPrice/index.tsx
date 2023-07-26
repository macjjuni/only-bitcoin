import { useState } from 'react'
import { Stack } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { IoLogoUsd } from 'react-icons/io'

import { LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/LottieItem'
import CardItem from '@/components/CardItem'
import CountText from '@/components/CountText'
import Kimchi from './components/Kimchi'
import NotKeyNotBtc from './components/NotKeyNotBtc'
import { btcInfo } from '@/data/btcInfo'

import { type IBtc, type MarketType, type IExRate } from '@/zustand/type'

// Lottie Files
import bitcoin from '@/assets/bitcoin.json'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '160px', height: '160px' } }

interface IMarketPrice {
  btc: IBtc
  market: MarketType
  isKimchi: boolean
  exRate: IExRate
  setExRate: (exRate: IExRate) => void
}

const MarketPrice = ({ btc, market, isKimchi, exRate, setExRate }: IMarketPrice) => {
  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => {
    setSpeed(2)
  }
  const mouseLeave = () => {
    setSpeed(1)
  }

  return (
    <CardItem icon={btcInfo.icon(24)} noShadow>
      <Stack onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} justifyContent="center" height="240px">
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center" pr="8px">
          <LottieItem option={btcOption} animationData={bitcoin} speed={speed + 0.8} />

          <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px" position="relative">
            {isKimchi && <Kimchi btc={btc} exRate={exRate} setExRate={setExRate} />}
            {market?.includes('KRW') && (
              <Stack className={`${btc.krwColor ? 'up' : 'down'}`} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
                <FaWonSign fontSize={26} />
                <CountText className="price-txt-lg" text={btc.krw} duration={0.3} />
              </Stack>
            )}
            {market?.includes('USD') && (
              <Stack className={`${btc.usdColor ? 'up' : 'down'}`} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
                <IoLogoUsd fontSize={27} style={{ marginRight: '-4px' }} />
                <CountText className="price-txt-lg" text={btc.usd} duration={0.3} />
              </Stack>
            )}
          </Stack>
        </Stack>
        <NotKeyNotBtc />
      </Stack>
    </CardItem>
  )
}

export default MarketPrice
