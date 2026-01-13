import { PageLayout } from '@/layouts'
import { PremiumLottie, PremiumPanel } from '@/components/features/premium'
import { Metadata } from "next";
import { env } from "@/shared/config/env";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Premium`,
  description: '실시간 비트코인 김치 프리미엄 현황을 실시간으로 확인하세요.',
};


export default function PremiumPage() {

  return (
    <PageLayout className="relative overflow-x-hidden isolation-auto gap-2.5">
      <PremiumLottie/>
      <PremiumPanel/>
    </PageLayout>
  )
}