import { useEffect, useState, useCallback } from 'react'
import moment from 'moment'

import ChipItem from '@/components/atom/ChipItem'

import { bearStore, useBearStore } from '@/zustand/store'
import { getCurrencies } from '@/api/dominance'
import { getDominace, getNowDate, valueCheck } from '@/utils/common'

const limitMins = 10 // 분(min)
const intervalTime = 300000 // Interval Time(ms): 5분

const BtcDominance = () => {
  // const timerRef = useRef<NodeJS.Timer | null>()
  // 👇 BTC시세 업데이트 마다 렌더링 방지하기 위해 스토어에서 할당하지 않고 개별 State로 관리
  // const [dominance, setDominance] = useState(bearStore.dominance)
  const dominance = useBearStore((state) => state.dominance)

  // 도미넌스 데이터 초기화
  // const updateDominance = useCallback(async () => {
  //   const res = await getCurrencies()
  //   if (res) {
  //     const getDominance = { value: `${getDominace(res)}%`, date: getNowDate() }
  //     bearStore.updateDoimnance(getDominance)
  //     setDominance(getDominance)
  //   }
  // }, [])

  // 일정 시간동안 반복 실행
  // const intervalRun = useCallback((func: () => void) => {
  //   timerRef.current = setInterval(async () => {
  //     func()
  //   }, intervalTime)
  // }, [])

  // 업데이트 시간 체크해서 업데이트 실행
  // const updateCheck = useCallback(() => {
  //   const valCheck = valueCheck(dominance.date)
  //   if (!valCheck) updateDominance()
  //   else {
  //     const minDiff = Math.floor(moment.duration(moment().diff(dominance.date)).asMinutes())
  //     if (minDiff > limitMins) updateDominance() // 10분 이후면 업데이트
  //   }
  // }, [])

  // useEffect(() => {
  //   updateCheck()
  //   intervalRun(updateDominance)
  // }, [])
  return <ChipItem label="BTC.D" value={dominance.value} />
}

export default BtcDominance
