import { Container } from '@mui/material'
import { useEffect, useLayoutEffect, useState } from 'react'

import Spinner from '@/components/Spinner'
import Home from '@/pages/Home'

import { useBearStore } from '@/zustand/store'
import initSocket from '@/api/socket'
import initBinance from '@/api/binance'

const Main = () => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const btc = useBearStore((state) => state.btc)

  // const test = () => {
  //   disconnect()
  // }

  useLayoutEffect(() => {
    initSocket()
    initBinance()
  }, [])

  useEffect(() => {
    if (!load && btc.priceKRW !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

  return (
    <Container component="main" className="main">
      {/* <button type="button" onClick={test}>
        DisConnect
      </button> */}
      <Spinner isRender={load} />
      <Home />
    </Container>
  )
}

export default Main
