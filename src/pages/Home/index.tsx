import React, { useState } from 'react'

import { Stack, Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import styled from '@emotion/styled'
import Lottie, { LottieProps } from 'react-lottie-player'
import bitcoin from '@/assets/bitcoin.json'
import equal from '@/assets/equal.json'

import BtcToPrice from './components/BtcToPrice'
import BtcToSat from './components/BtcToSat.tsx'
import { btcInfo } from '@/data/crypto'
import { useBearStore } from '@/zustand/store'

const tabMenus = ['BTC/KRW', 'BTC/SAT']
// Lottie Option
const defaultOptions: LottieProps = {
  loop: true,
  play: true,
  style: { width: '70px', height: '70px', margin: '0' },
}

const UnitSpan = styled.span`
  font-size: 18px;
  padding-left: 3px;
  text-shadow: none;
`

const Home = () => {
  // State
  const [select, setSelect] = useState<string | null>(tabMenus[0]) // Tab Menu
  const btc = useBearStore((state) => state.btc) // Zustand Store

  // 크립토 변경
  const handleSelect = (e: React.MouseEvent<HTMLElement>, next: string) => {
    if (next === null) return
    setSelect(next)
  }

  return (
    <Stack direction="column" useFlexGap flexWrap="wrap" gap="1rem" width={400}>
      <Typography variant="h1" display="flex" alignItems="center" justifyContent="center" fontSize={32} fontWeight={500} padding="1rem 0 2rem" sx={{ textShadow: `1px 1px 1px ${btcInfo.color}` }}>
        <Lottie {...defaultOptions} animationData={bitcoin} speed={2.4} />
        <Lottie {...defaultOptions} animationData={equal} speed={1.6} />
        <Box>
          {btc.price.toLocaleString()}
          <UnitSpan>KRW</UnitSpan>
        </Box>
      </Typography>

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
        {select === 'BTC/SAT' && <BtcToSat />}
      </Box>
    </Stack>
  )
}

export default Home
