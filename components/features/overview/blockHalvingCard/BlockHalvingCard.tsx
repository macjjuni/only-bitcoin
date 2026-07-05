'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useLottie } from 'lottie-react'
import useStore from '@/shared/stores/store'
import { comma } from '@/shared/utils/string'
import { calcPercentage, getNextHalvingData } from '@/shared/utils/calculate'
import blockLottieJson from '@/shared/assets/lottie/blocks.json'
import { calcDate } from '@/shared/lib/date'

const totalSegments = 24 as const


export default function BlockHalvingCard() {

  // region [Hooks]
  const { View, animationItem } = useLottie({ animationData: blockLottieJson, loop: true })

  const blockData = useStore((state) => state.blockData)
  const recentBlockHeight = useMemo(() => blockData[0]?.height ?? 0, [blockData])
  const nextHalvingData = useMemo(() => getNextHalvingData(recentBlockHeight), [recentBlockHeight])
  const halvingPercent = useMemo(() => calcPercentage(nextHalvingData?.blockHeight, recentBlockHeight), [nextHalvingData, recentBlockHeight])
  const restBlockCount = useMemo(() => (nextHalvingData.blockHeight - recentBlockHeight), [nextHalvingData, recentBlockHeight])
  // eslint-disable-next-line react-hooks/purity
  const expectNextHalvingDate = useMemo(() => calcDate(Date.now(), restBlockCount * 10, 'minute', 'YYYY.MM.DD'), [restBlockCount])
  // endregion


  // region [Privates]
  const currentBlockIndex = Math.floor((halvingPercent / 100) * totalSegments)

  /**
   * 반감기 진행도 세그먼트 렌더링
   * 25개의 세그먼트를 생성하고 현재 진행도에 따라 스타일을 적용합니다.
   */
  const renderSegments = useMemo(() => {
    return Array.from({ length: totalSegments }, (_, index) => {
      const isFilled = index < currentBlockIndex
      const isActive = index === currentBlockIndex

      const isFirst = index === 0
      const isLast = index === totalSegments - 1

      const className = [
        'flex-1 h-full transition-all duration-300',
        isFirst ? 'rounded-l-sm' : '',
        isLast ? 'rounded-r-sm' : '',
        isFilled && !isActive ? 'bg-current' : '',
        isActive ? 'bg-current animate-blink-fade' : '',
        !isFilled && !isActive ? 'bg-current opacity-20' : '',
      ].filter(Boolean).join(' ')

      return <div key={index} className={className}/>
    })
  }, [currentBlockIndex])

  const initializeLottieSpeed = useCallback(() => {
    if (!animationItem) {
      return
    }
    animationItem?.setSpeed(0.48)
  }, [animationItem])
  // endregion


  // region [Life Cycles]
  useEffect(initializeLottieSpeed, [View])
  // endregion


  return (
    <div className="flex flex-col justify-between gap-2 p-0 mt-2 border-none">

      {/* .block-halving-card__header */}
      <h2 className="text-lg font-bold mb-1">Bitcoin Halving</h2>

      {/* .block-halving-card__content */}
      <div className="flex justify-between items-center gap-4">
        {/* .block-halving-card__gauge */}
        <div className="flex w-[70%] h-9 gap-0.5">
          {renderSegments}
        </div>

        <span className="text-xl font-bold pr-1 text-current drop-shadow-[0_0_10px_rgba(var(--font-rgb),0.5)]">
          {halvingPercent}%
        </span>
      </div>

      {/* .block-halving-card__info */}
      <div className="flex justify-between items-center gap-3 pr-1">
        <div className="relative w-14 h-14">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
            {View}
          </div>
        </div>

        {/* Info Items */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Current</span>
          <span className="font-number font-bold text-base">{comma(recentBlockHeight)}</span>
        </div>

        <div className="w-px h-9 bg-current"/>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Remaining</span>
          <span className="font-number font-bold text-base">
            {comma(nextHalvingData.blockHeight - recentBlockHeight)}
          </span>
        </div>

        <div className="w-px h-9 bg-current"/>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Estimated Date</span>
          <span className="font-number font-bold text-base">{expectNextHalvingDate}</span>
        </div>
      </div>
    </div>
  )
};