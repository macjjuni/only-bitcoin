import { memo, useCallback, useEffect, useState, useRef } from 'react'
import moment from 'moment'
import FearGreedDialog from '@/components/modal/FearGreedDialog'
import { useBearStore } from '@/zustand/store'
import ChipItem from '../../Chip'
import { getFearGreed } from '@/api/fearGreed'

const limitMins = 10 // 분(min)
const intervalTime = 300000 // Interval Time(ms): 5분

const FearGreed = () => {
  const timerRef = useRef<NodeJS.Timer | null>(null)
  const { fearGreed, updateFearGreed } = useBearStore((state) => state)
  const [isModal, setModal] = useState(false)

  const openFearGreed = useCallback(() => {
    setModal(true)
  }, [])

  // 공포 탐욕 지수 데이터 초기화
  const updateFGIndex = useCallback(async () => {
    const data = await getFearGreed()
    updateFearGreed(data)
  }, [])

  // 일정 기간동안 반복 실행
  const intervalRun = useCallback((func: () => void) => {
    timerRef.current = setInterval(async () => {
      func()
    }, intervalTime)
  }, [])

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = useCallback(() => {
    const minDiff = Math.floor(moment.duration(moment().diff(fearGreed.date)).asMinutes())
    if (Number.isNaN(minDiff) || minDiff > limitMins) updateFGIndex() // 10분 이후면 업데이트
  }, [])

  useEffect(() => {
    updateCheck()
    intervalRun(updateCheck)
    return () => {
      if (timerRef.current === null) return
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <>
      <ChipItem label="F&GI" value={fearGreed.value} onClick={openFearGreed} />
      <FearGreedDialog open={isModal} setOpen={setModal} />
    </>
  )
}

export default memo(FearGreed)
