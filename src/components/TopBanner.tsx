import { useEffect, useState, useRef } from 'react'
import { Stack, Typography } from '@mui/material'
import { getCurrencies } from '@/api/dominance'
import { getDominace } from '@/utils/common'

const updateTime = 300000 // ms
const errMsg = 'Error 🕷️'

const Topbanner = () => {
  const timerRef = useRef<NodeJS.Timer | null>()
  const [btcD, setBtcD] = useState('0')

  const updateDominance = async () => {
    const res = await getCurrencies()
    if (res) setBtcD(`${getDominace(res)} %`)
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
    <Stack className="top-banner" display="flex" flexDirection="row" justifyContent="flex-start" alignItems="center">
      <Typography fontSize="inherit" fontWeight="bold">
        BTC.D : {btcD}
      </Typography>
    </Stack>
  )
}
export default Topbanner
