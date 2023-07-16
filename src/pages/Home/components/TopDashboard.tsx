import { useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { IoLogoUsd } from 'react-icons/io'
import { LottieProps } from 'react-lottie-player'
import { useBearStore } from '@/zustand/store'
import CountText from '@/components/CountText'
import Kimchi from './Kimchi'
import LottieItem from '@/components/Lottie'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '90px', height: '90px' } }
const equalOption = { ...defaultOption, style: { width: '50px', height: '90px' } }

const TopDashboard = () => {
  // State
  const { btc, market, isKimchi } = useBearStore((state) => state) // Zustand Store

  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => {
    setSpeed(3)
  }
  const mouseLeave = () => {
    setSpeed(1)
  }

  return (
    <Stack onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} gap="12px">
      <Typography variant="h1" className="top-dashboard">
        <LottieItem option={btcOption} animationData={bitcoin} speed={speed + 0.8} />
        <LottieItem option={equalOption} animationData={equal} speed={speed + 1} />

        <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px" position="relative">
          {isKimchi && <Kimchi />}
          {market?.includes('KRW') && (
            <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
              <CountText className="market-price-txt" text={btc.krw} duration={0.3} />
              <FaWonSign fontSize={26} />
            </Stack>
          )}
          {market?.includes('USD') && (
            <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
              <CountText className="market-price-txt" text={btc.usd} duration={0.3} />
              <IoLogoUsd fontSize={30} />
            </Stack>
          )}
        </Stack>
      </Typography>
      <Typography component="h2" id="not-key-not-btc">
        Not your keys, not your ₿itcoin
      </Typography>
    </Stack>
  )
}

export default TopDashboard
