import { memo, useCallback, useLayoutEffect } from 'react'
import { useBearStore, bearStore } from '@/store'
import { getBtcRecentBlockHeight } from '@/api/mempool'
import interval from '@/utils/interval'
import { isDev } from '@/utils/common'

const intervalTime = 1 * 60000 // Interval Time(ms): 2분

const BtcBlockInit = () => {
  const blockData = useBearStore((state) => state.blockData)
  // 비트코인 블록 데이터 초기화
  const updateBlockHeight = useCallback(async () => {
    console.log('🏃🏻‍♂️ 블록 상태 조회!')
    const { height, timeStamp } = await getBtcRecentBlockHeight()
    bearStore.updateBlock({ height, timeStamp, updateTimeStamp: Number(new Date()) })
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
    if (isDev) console.log('✅ BTC 블록 상태 초기화')
    updateCheck()
    const blockInterval = interval(updateBlockHeight, intervalTime)
    blockInterval.start()
  }, [])

  return null
}

export default memo(BtcBlockInit)
