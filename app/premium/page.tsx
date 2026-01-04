'use client'

import { useMemo } from 'react'
import { PremiumPanel } from './components'
import { PageLayout } from '@/layouts'
import { Lottie } from '@/components'
import premiumData from '@/shared/assets/lottie/premium.json'


const LottieData = {
  animationData: premiumData,
  width: '520px',
  height: '520px',
}

export default function PremiumPage() {

  // region [Hooks]
  const PremiumLottie = useMemo(() => (
    <div className="absolute top-[-88px] right-[-160px] opacity-100 -z-[1] animate-swing">
      <Lottie {...LottieData} />
    </div>
  ), [])
  // endregion

  return (
    <PageLayout className="gap-3 overflow-hidden [perspective:1000px]">
      {PremiumLottie}
      <PremiumPanel/>
    </PageLayout>
  )
}
