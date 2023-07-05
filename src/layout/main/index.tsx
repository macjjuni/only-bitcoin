import { Container } from '@mui/material'
import { useEffect, useLayoutEffect, useState, useCallback } from 'react'

import Spinner from '@/components/Spinner'
import Home from '@/pages/Home'

import { useBearStore } from '@/zustand/store'
import initUpbit from '@/socket/upbit' //
import initBinance from '@/socket/binance'

const Main = () => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const btc = useBearStore((state) => state.btc)

  const socketInit = useCallback(() => {
    console.log('socket init')
    initUpbit()
    initBinance()
  }, [])

  // const disconnect = () => {
  //   upbitDisconnect()
  //   binanceDisconnect()
  // }

  useLayoutEffect(() => {
    socketInit()
  }, [])

  useEffect(() => {
    if (!load && btc.krw !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

  return (
    <Container component="main" className="main">
      {/* <button type="button" onClick={disconnect}>
        Disconnect
      </button> */}
      <Spinner isRender={load} />
      <Home />
    </Container>
  )
}

export default Main
