'use client'

import {
  useBinanceSocket,
  useBithumbSocket,
  useCoinbaseSocket,
  useInitializeBackground,
  useInitializeDisabledZoom,
  useInitializePage,
  useInitializePWA,
  useMempoolSocket,
  useTheme,
  useUpbitSocket,
  useUsdExchangeRate,
} from '@/shared/hooks/initializer'
import { getToastProps } from '@/shared/constants/toast'
import { KToast } from 'kku-ui'

export default function Initializer() {

  useCoinbaseSocket()
  useTheme()
  useUpbitSocket()
  useBithumbSocket()
  useBinanceSocket()
  useMempoolSocket()
  useUsdExchangeRate()
  useInitializeDisabledZoom()
  useInitializeBackground()
  useInitializePage()
  useInitializePWA()

  return (
    <KToast {...getToastProps()} offset={120}/>
  )
}