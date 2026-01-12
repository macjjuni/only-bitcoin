'use client'

import { PageLayout } from '@/layouts'
import { PremiumLottie, PremiumPanel } from './components'


export default function PremiumPage() {

  return (
    <PageLayout className="relative overflow-x-hidden isolation-auto gap-2.5">
      <PremiumLottie/>
      <PremiumPanel/>
    </PageLayout>
  )
}