import { useEffect, useState } from 'react'
import { Container } from '@mui/material'
import Spinner from '@/components/Spinner'

import { useBearStore } from '@/zustand/store'

const Main = ({ children }: { children: JSX.Element }) => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const { btc } = useBearStore((state) => state)

  useEffect(() => {
    if (!load && btc.krw !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

  return (
    <Container component="main" className="main">
      <Spinner isRender={load} />
      {children}
    </Container>
  )
}

export default Main
