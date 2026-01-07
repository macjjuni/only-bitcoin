'use client'

import { PageLayout } from '@/layouts'
import { PremiumLottie, PremiumPanel } from './components'


export default function PremiumPage() {

  return (
    <PageLayout className="relative isolation-auto overflow-hidden gap-3 [perspective:1000px]">
      <PremiumLottie/>
      <PremiumPanel/>
    </PageLayout>
  )
}