import { useState } from 'react'
import { Stack, Typography } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { BsCurrencyDollar } from 'react-icons/bs'
import { LottieProps } from 'react-lottie-player'
import { useBearStore } from '@/zustand/store'
import CountText from '@/components/CountText'
import LottieItem from '@/components/Lottie'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '90px', height: '90px' } }
const equalOption = { ...defaultOption, style: { width: '50px', height: '90px' } }

const TopDashboard = () => {
  // State
  const btc = useBearStore((state) => state.btc) // Zustand Store

  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => setSpeed(3)
  const mouseLeave = () => setSpeed(1)

  return (
    <Stack onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} gap="12px">
      <Typography variant="h1" className="top-dashboard">
        <LottieItem option={btcOption} animationData={bitcoin} speed={speed + 0.8} />
        <LottieItem option={equalOption} animationData={equal} speed={speed + 1} />
        <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px">
          <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30}>
            <CountText className="market-price-txt" text={btc.krw} duration={0.3} />
            <FaWonSign fontSize={23} />
          </Stack>
          <Stack flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={26}>
            <CountText className="market-price-txt" text={btc.usd} duration={0.3} />
            <BsCurrencyDollar fontSize={23} />
          </Stack>
        </Stack>
      </Typography>
      <Typography component="h2" id="not-key-not-btc">
        Not your keys, not your ₿itcoin
      </Typography>
    </Stack>
  )
}

export default TopDashboard
