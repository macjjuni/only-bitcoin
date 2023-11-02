import { useCallback, useLayoutEffect } from 'react'
import moment from 'moment'
import { getCurrencies } from '@/api/dominance'
import { getDominace, getNowDate, valueCheck, isDev } from '@/utils/common'
import { bearStore, useBearStore } from '@/store'
import interval from '@/utils/interval'

const limitMins = 10 // 분(min)
const intervalTime = 5 * 60000 // Interval Time(ms): 5분

const DominanceInit = () => {
  const dominance = useBearStore((state) => state.dominance)
  // BTC 도미넌스 데이터 초기화
  const updateDominance = useCallback(async () => {
    const res = await getCurrencies()
    if (res) {
      const getDominance = { value: `${getDominace(res)}%`, date: getNowDate() }
      bearStore.updateDoimnance(getDominance)
    }
  }, [])

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = useCallback(() => {
    const valCheck = valueCheck(dominance.date)
    if (!valCheck) updateDominance()
    else {
      const minDiff = Math.floor(moment.duration(moment().diff(dominance.date)).asMinutes())
      if (minDiff > limitMins) updateDominance() // 10분 이후면 업데이트
    }
  }, [])

  useLayoutEffect(() => {
    if (isDev) console.log('✅ BTC 도미넌스 초기화')
    updateCheck()
    const blockInterval = interval(updateDominance, intervalTime)
    blockInterval.start()
  }, [])

  return null
}

export default DominanceInit
