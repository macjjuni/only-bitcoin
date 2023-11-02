import { ReactNode, useLayoutEffect } from 'react'

import initUpbit from '@/socket/upbit'
import initBinance from '@/socket/binance'
import GoogleGA from '@/components/initial/GoogleGA'
import AdsenseCodeSnippet from '@/components/initial/AdSenseCodeSnippet'
import BtcBlockInit from '@/components/initial/BtcBlockInit'
import Dominance from './Dominance'

const isDev = import.meta.env.MODE === 'development'

// 초기화 HOC
const Initializer = ({ children }: { children: ReactNode }) => {
  GoogleGA()
  useLayoutEffect(() => {
    initBinance()
    initUpbit()
  }, [])
  return (
    <>
      {/* BTC Block 상태 조회 */}
      <BtcBlockInit />
      {/* BTC 도미넌스 조회 */}
      <Dominance />
      {/* 애드센스... 승인 될 수 있으려나.. */}
      {!isDev && <AdsenseCodeSnippet />}
      {children}
    </>
  )
}

export default Initializer
