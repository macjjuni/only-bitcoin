import { Container } from '@mui/material'
import { useEffect, useLayoutEffect, useState, useCallback } from 'react'

import Spinner from '@/components/Spinner'
import Home from '@/pages/Home'

import { useBearStore } from '@/zustand/store'
import initUpbit, { closeUpbit } from '@/socket/upbit' //
import initBinance, { closeBinance } from '@/socket/binance'

const Main = () => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const { btc, market } = useBearStore((state) => state)

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

  useEffect(() => {
    if (!load && btc.krw !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

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
    <Container component="main" className="main">
      <Spinner isRender={load} />
      <Home />
    </Container>
  )
}

export default Main
