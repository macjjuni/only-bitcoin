import { useState } from 'react'
import { Stack } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { IoLogoUsd } from 'react-icons/io'
import { LottieProps } from 'react-lottie-player'
import { useBearStore } from '@/zustand/store'
import BoxItem from '@/components/BoxItem'
import CountText from '@/components/CountText'
import Kimchi from './Kimchi'
import NotKeyNotBtc from './NotKeyNotBtc'
import LottieItem from '@/components/Lottie'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'
import { btcInfo } from '@/data/btcInfo'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '90px', height: '90px' } }
const equalOption = { ...defaultOption, style: { width: '50px', height: '90px' } }

const MarketPrice = () => {
  // State
  const { btc, market, isKimchi, exRate, setExRate } = useBearStore((state) => state) // Zustand Store

  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => {
    setSpeed(3)
  }
  const mouseLeave = () => {
    setSpeed(1)
  }

  return (
    <BoxItem icon={btcInfo.icon(24)} title="Market Price">
      <Stack onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} justifyContent="center" height="240px" gap="40px">
        <Stack flexDirection="row" justifyContent="center" alignItems="center" gap={1}>
          <LottieItem option={btcOption} animationData={bitcoin} speed={speed + 0.8} />
          <LottieItem option={equalOption} animationData={equal} speed={speed + 1} />

          <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px" position="relative">
            {isKimchi && <Kimchi btc={btc} exRate={exRate} setExRate={setExRate} />}
            {market?.includes('KRW') && (
              <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
                <FaWonSign fontSize={24} />
                <CountText className="price-txt-lg" text={btc.krw} duration={0.3} />
              </Stack>
            )}
            {market?.includes('USD') && (
              <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
                <IoLogoUsd fontSize={26} style={{ marginRight: '-4px' }} />
                <CountText className="price-txt-lg" text={btc.usd} duration={0.3} />
              </Stack>
            )}
          </Stack>
        </Stack>
        <NotKeyNotBtc />
      </Stack>
    </BoxItem>
  )
}

export default MarketPrice
