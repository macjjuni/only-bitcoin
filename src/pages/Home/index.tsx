import React, { useState } from 'react'

import { Stack, Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import CountUp from 'react-countup'
import Lottie, { LottieProps } from 'react-lottie-player'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'

import BtcToPrice from './components/BtcToPrice'
// import BtcToSat from './components/BtcToSat.tsx'
import { btcInfo } from '@/data/crypto'
import { useBearStore } from '@/zustand/store'

const tabMenus = ['BTC/KRW']
// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const btcOption = { ...defaultOption, style: { width: '90px', height: '90px' } }
const equalOption = { ...defaultOption, style: { width: '50px', height: '90px', marginLeft: '-8px' } }

const Home = () => {
  // State
  const [select, setSelect] = useState<string | null>(tabMenus[0]) // Tab Menu
  const btc = useBearStore((state) => state.btc) // Zustand Store

  const [speed, setSpeed] = useState(1)
  const mouseEnter = () => setSpeed(3)
  const mouseLeave = () => setSpeed(1)

  // 크립토 변경
  const handleSelect = (e: React.MouseEvent<HTMLElement>, next: string) => {
    if (next === null) return
    setSelect(next)
  }

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
          <Lottie {...btcOption} animationData={bitcoin} speed={speed + 0.5} />
          <Lottie {...equalOption} animationData={equal} speed={speed + 1} />
          <Box>
            <CountUp start={convertToZero(btc.price)} end={btc.price} duration={0.3} />

            <span className="unit-txt">KRW</span>
          </Box>
        </Typography>
        <Typography component="h2" id="not-key-not-btc">
          Not your keys, not your ₿itcoin
        </Typography>
      </Stack>

      <ToggleButtonGroup exclusive aria-label="text alignment" value={select} onChange={handleSelect}>
        {tabMenus.map((tab) => (
          <ToggleButton key={tab} value={tab} sx={{ width: '100%' }}>
            <Typography ml={1.5} fontWeight="bold" fontSize="large" color={btcInfo.color}>
              {tab}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box height="220px">
        {select === 'BTC/KRW' && <BtcToPrice />}
        {/* {select === 'BTC/SAT' && <BtcToSat />} */}
      </Box>
    </Stack>
  )
}

export default Home
