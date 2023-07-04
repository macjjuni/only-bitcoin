import { useState } from 'react'

import { Stack, Box, Typography } from '@mui/material'
import CountUp from 'react-countup'
import { LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/Lottie'
import ToggleGroup from '@/pages/Home/components/ToggleGroup.tsx'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'

import BtcToPrice from './components/BtcToPrice'
import { useBearStore } from '@/zustand/store'
import { assetList } from '@/data/crypto'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '90px', height: '90px' } }
const equalOption = { ...defaultOption, style: { width: '50px', height: '90px', marginLeft: '-8px' } }

const Home = () => {
  // State
  const [select, setSelect] = useState<string | null>(assetList[0]) // Tab Menu
  const btc = useBearStore((state) => state.btc) // Zustand Store

  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => setSpeed(3)
  const mouseLeave = () => setSpeed(1)

  // 카운트다운 애니메이션 최소값
  const convertToZero = (num: number) => {
    const firstDigit = Math.floor(num / 10 ** Math.floor(Math.log10(num)))
    const convertedNumber = firstDigit * 10 ** Math.floor(Math.log10(num))
    return convertedNumber
  }

  return (
    <Stack onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} direction="column" useFlexGap flexWrap="wrap" gap="1rem" maxWidth={400} width="100%" m="auto">
      <Stack gap="12px">
        <Typography variant="h1" className="top-dashboard">
          <LottieItem option={btcOption} animationData={bitcoin} speed={speed + 0.5} />
          <LottieItem option={equalOption} animationData={equal} speed={speed + 1} />
          <Box>
            <CountUp start={convertToZero(btc.price)} end={btc.price} duration={0.3} />
            <span className="unit-txt">KRW</span>
          </Box>
        </Typography>
        <Typography component="h2" id="not-key-not-btc">
          Not your keys, not your ₿itcoin
        </Typography>
      </Stack>

      <ToggleGroup select={select} setSelect={setSelect} />

      <Box height="220px">{select === 'BTC/KRW' && <BtcToPrice />}</Box>
    </Stack>
  )
}

export default Home
