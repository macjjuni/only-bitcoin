import { useLayoutEffect, useCallback } from 'react'
import { Stack } from '@mui/material'

import { useBearStore } from '@/zustand/store'

import initUpbit, { closeUpbit } from '@/socket/upbit'
import initBinance, { closeBinance } from '@/socket/binance'

import TopDashboard from '@/pages/Home/components/TopDashboard'
import BtcToPrice from '@/pages/Home/components/BtcToPrice'

const Home = () => {
  const { market } = useBearStore((state) => state)
  // 업비트 소켓 연결 초기화
  const upbitInit = useCallback(() => {
    closeUpbit()
    initUpbit()
  }, [])
  // 바이넨스 소켓 연결 초기화
  const binanceInit = useCallback(() => {
    closeBinance()
    initBinance()
  }, [])

  useLayoutEffect(() => {
    if (market === 'KRW') {
      initUpbit()
      closeBinance()
    } else if (market === 'USD') {
      initBinance()
      closeUpbit()
    } else {
      binanceInit()
      upbitInit()
    }
  }, [market])

  return (
    <Stack direction="column" useFlexGap flexWrap="wrap" gap="1rem" maxWidth={400} width="100%" m="auto">
      <TopDashboard />
      <BtcToPrice />
    </Stack>
  )
}

export default Home
