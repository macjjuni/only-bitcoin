import { Container } from '@mui/material'
import { useEffect, useState } from 'react'

import styled from '@emotion/styled'
import Spinner from '@/components/Spinner'
import Home from '@/pages/Home'

import { useBearStore } from '@/zustand/store'
import initSocket from '@/api/socket'

const MainWrapper = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 24px 120px 24px;
  min-height: calc(100vh - 134px);
`

const Main = () => {
  const [load, setLoad] = useState(false) // 렌더링(소켓 연결)
  const btc = useBearStore((state) => state.btc)

  useEffect(() => {
    initSocket()
  }, [])

  useEffect(() => {
    if (!load && btc.price !== 0) setLoad(true) // 시세 변동 시 계산 => 코인 개수를 기준으로 가격 변환
  }, [btc])

  return (
    <MainWrapper>
      <Spinner isRender={load} />
      <Home />
    </MainWrapper>
  )
}

export default Main
