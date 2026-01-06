'use client'

import { useEffect, useMemo } from 'react'
import { PremiumPanel } from './components'
import { PageLayout } from '@/layouts'
import premiumData from '@/shared/assets/lottie/premium.json'
import { useLottie } from "lottie-react";


const LottieOptions = {
  animationData: premiumData,
  width: '520px',
  height: '520px',
}

export default function PremiumPage() {

  // region [Hooks]
  const { View, play } = useLottie({ animationData: LottieOptions.animationData, autoplay: false });

  const PremiumLottie = useMemo(() => (
    <div className="absolute top-[-88px] right-[-160px] opacity-100 -z-[1] animate-swing">
      <div style={{ width: LottieOptions.width, height: LottieOptions.height }}>{View}</div>
    </div>
  ), [View])
  // endregion


  // region [Privates]
  const onPlayLottie = () => {
    setTimeout(play, 0);
  }
  // endregion


  // region [Life Cycles]
  useEffect(onPlayLottie, []);
  // endregion

  return (
    <PageLayout className="gap-3 overflow-hidden [perspective:1000px]">
      {PremiumLottie}
      <PremiumPanel/>
    </PageLayout>
  )
}
