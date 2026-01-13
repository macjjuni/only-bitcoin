import { ConvertPanel, PremiumBadge } from '@/components/features/btc2fiat'
import { PageLayout } from '@/layouts'
import { Metadata } from "next";
import { env } from "@/shared/config/env";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - BTC to KRW`,
  description: '실시간 시세를 반영한 비트코인 계산기를 이용해 보세요.',
};

export default function Btc2FiatPage() {

  return (
    <PageLayout className="!pt-4">
      <PremiumBadge/>
      <ConvertPanel/>
    </PageLayout>
  )
}
