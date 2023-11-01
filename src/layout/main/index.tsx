import { useEffect, useLayoutEffect, useState } from 'react'
import { Container } from '@mui/material'
import { layout } from '@/styles/style'
import Spinner from '@/components/loading/Spinner'

import initUpbit from '@/socket/upbit'
import initBinance from '@/socket/binance'

import { useBearStore } from '@/zustand/store'

const Main = ({ children }: { children: JSX.Element }) => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const { btc } = useBearStore((state) => state)

  useEffect(() => {
    if (!load && btc.krw !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

  useLayoutEffect(() => {
    initBinance()
    initUpbit()
  }, [])

  return (
    <Container component="main" className="main" sx={{ minHeight: `calc(100dvh - ${layout.main}px)` }}>
      <Spinner isRender={load} />
      {children}
    </Container>
  )
}

export default Main
