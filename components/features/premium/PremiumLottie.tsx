'use client'

import { memo, useState, useEffect } from 'react'
import premiumData from '@/shared/assets/lottie/premium.json'
import { useLottie } from 'lottie-react'

// region [Constants]
const LOTTIE_OPTIONS = {
  animationData: premiumData,
  width: 520,
  height: 520,
}
const INITIAL_TRANSFORM = 'perspective(1000px) rotateY(0deg)'
// endregion


const PremiumLottie = () => {

  // region [Hooks]
  const [isAnimationActive, setIsAnimationActive] = useState(false)
  const { View } = useLottie({ animationData: LOTTIE_OPTIONS.animationData })
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const animationTimer = setTimeout(() => {
      setIsAnimationActive(true)
    }, 500)

    return () => clearTimeout(animationTimer)
  }, [])
  // endregion


  return (
    <div
      className={[
        'absolute top-[-72px] right-[-160px] -z-[1]',
        'transition-transform duration-1000 ease-out',
        isAnimationActive && 'animate-swing',
        'layout:[view-transition-name:premium-lottie']
        .filter(Boolean).join(' ')
      }
      style={{ transform: INITIAL_TRANSFORM, contain: 'paint' }}
    >
      <div style={{ width: LOTTIE_OPTIONS.width, height: LOTTIE_OPTIONS.height }}>
        {View}
      </div>
    </div>
  )
}

export default memo(PremiumLottie)