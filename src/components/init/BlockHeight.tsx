import { memo, useRef, useCallback, useLayoutEffect } from 'react'
import { useBearStore, bearStore } from '@/zustand/store'
import { getBtcRecentBlockHeight } from '@/api/mempool'

const intervalTime = 120000 // Interval Time(ms): 2분

const BlockHeight = () => {
  const timerRef = useRef<NodeJS.Timer | null>()
  const blockData = useBearStore((state) => state.blockData)

  // 비트코인 최신 블록 데이터 초기화
  const updateBlockHeight = useCallback(async () => {
    console.log('블록 상태 조회')
    const { height, timeStamp } = await getBtcRecentBlockHeight()
    bearStore.updateBlock({ height, timeStamp, updateTimeStamp: Number(new Date()) })
  }, [])

  // 일정 기간동안 반복 실행
  const intervalRun = useCallback((func: () => void) => {
    timerRef.current = setInterval(async () => {
      func()
    }, intervalTime)
  }, [])

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = useCallback(() => {
    if (blockData.height === 0) updateBlockHeight()
    else {
      const now = Date.now()
      const timeDiff = now - blockData.updateTimeStamp
      if (timeDiff >= intervalTime) updateBlockHeight() // 업데이트한지 2분 이후면 업데이트 재실행
    }
  }, [])

  useLayoutEffect(() => {
    updateCheck()
    intervalRun(updateBlockHeight)
  }, [])

  return null
}

export default memo(BlockHeight)
