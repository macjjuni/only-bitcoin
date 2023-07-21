import { useEffect, useState, useRef, memo } from 'react'
import { Stack, AppBar } from '@mui/material'
import { layout } from '@/styles/style'

import ChipItem from '@/components/Chip'
import RefreshButton from '@/components/RefreshButton'

import { useBearStore } from '@/zustand/store'
import { getCurrencies } from '@/api/dominance'
import { getDominace, comma } from '@/utils/common'

const updateTime = 300000 // ms
const errMsg = 'Error 🕷️'

const Header = () => {
  const timerRef = useRef<NodeJS.Timer | null>()
  const [btcD, setBtcD] = useState('0')
  const { basePrice } = useBearStore((state) => state.exRate)

  const updateDominance = async () => {
    const res = await getCurrencies()
    if (res) setBtcD(`${getDominace(res)}%`)
    else setBtcD(errMsg)
  }

  const intervalExe = (func: () => void) => {
    timerRef.current = setInterval(async () => {
      try {
        func()
      } catch (e) {
        if (timerRef.current === null) return
        setBtcD(errMsg)
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, updateTime)
  }

  useEffect(() => {
    updateDominance()
    intervalExe(updateDominance)
  }, [])

  return (
    <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
      <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="space-between">
        <Stack flexDirection="row" gap="8px">
          <ChipItem text={`BTC.D: ${btcD}`} />
          <ChipItem text={`USD/KRW: ${comma(basePrice?.toString())}`} />
        </Stack>
        <RefreshButton />
      </Stack>
    </AppBar>
  )
}

export default memo(Header)
