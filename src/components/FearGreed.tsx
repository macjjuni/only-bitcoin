import { memo, useEffect, useState, useRef } from 'react'
import { LottieProps } from 'react-lottie-player'
import moment from 'moment'
import LottieItem from '@/components/LottieItem'
import meter from '@/assets/meter.json'
import FearGreedDialog from '@/components/modal/FearGreedDialog'
import { useBearStore } from '@/zustand/store'
import ChipItem from './Chip'
import { getFearGreed } from '@/api/fearGreed'
import { valueCheck } from '@/utils/common'

// Lottie Option
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '48px', height: '48px' } }

const limitMins = 10 // 분(min)
const intervalTime = 300000 // Interval Time(ms): 5분

const FearGreed = () => {
  const timerRef = useRef<NodeJS.Timer | null>(null)
  const { isFearGreed, fearGreed, updateFearGreed } = useBearStore((state) => state)
  const [isModal, setModal] = useState(false)

  const openFearGreed = () => {
    setModal(true)
  }

  // 공포 탐욕 지수 데이터 초기화
  const updateFGIndex = async () => {
    const data = await getFearGreed()
    updateFearGreed(data)
  }

  // 일정 기간동안 반복 실행
  const intervalRun = (func: () => void) => {
    timerRef.current = setInterval(async () => {
      func()
    }, intervalTime)
  }

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = () => {
    const valCheck = valueCheck(fearGreed.value)
    if (!valCheck) updateFGIndex()
    else {
      const minDiff = Math.floor(moment.duration(moment().diff(fearGreed.date)).asMinutes())
      if (minDiff > limitMins) updateFGIndex() // 10분 이후면 업데이트
    }
  }

  useEffect(() => {
    updateCheck()
    intervalRun(updateCheck)
    return () => {
      if (timerRef.current === null) return
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  if (isFearGreed)
    // 공포 탐욕지수 사진 유형
    return (
      <>
        <button type="button" className="fear-greed-btn" onClick={openFearGreed}>
          <div className="fear-greed-lottie">
            <LottieItem option={lottieOption} animationData={meter} speed={0.4} />
          </div>
        </button>
        <FearGreedDialog open={isModal} setOpen={setModal} />
      </>
    )
  // 공포 탐욕지수 텍스트 유형
  else
    return (
      <>
        <ChipItem label="F&GI" value={fearGreed.value} />
      </>
    )
}

export default memo(FearGreed)
