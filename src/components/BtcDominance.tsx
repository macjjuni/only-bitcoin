import { useEffect, useRef, memo } from 'react'
import moment from 'moment'

import ChipItem from '@/components/Chip'

import { useBearStore } from '@/zustand/store'
import { getCurrencies } from '@/api/dominance'
import { getDominace, getNowDate, valueCheck } from '@/utils/common'

const limitMins = 10 // 분(min)
const intervalTime = 300000 // Interval Time(ms): 5분

const BtcDominance = () => {
  const timerRef = useRef<NodeJS.Timer | null>()
  const { dominance, updateDoimnance } = useBearStore((state) => state)

  // 도미넌스 데이터 초기화
  const updateDominance = async () => {
    const res = await getCurrencies()
    if (res) updateDoimnance({ value: `${getDominace(res)}%`, date: getNowDate() })
  }

  // 일정 기간동안 반복 실행
  const intervalRun = (func: () => void) => {
    timerRef.current = setInterval(async () => {
      func()
    }, intervalTime)
  }

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = () => {
    const valCheck = valueCheck(dominance.date)
    if (!valCheck) updateDominance()
    else {
      const minDiff = Math.floor(moment.duration(moment().diff(dominance.date)).asMinutes())
      if (minDiff > limitMins) updateDominance() // 10분 이후면 업데이트
    }
  }
  useEffect(() => {
    updateCheck()
    intervalRun(updateDominance)
  }, [])
  return <ChipItem label="BTC.D" value={dominance.value} />
}

export default memo(BtcDominance)
