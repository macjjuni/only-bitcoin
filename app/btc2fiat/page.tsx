import { ConvertPanel, PremiumBadge } from '@/components/features/btc2fiat'
import { PageLayout } from '@/layouts'


export default function Btc2FiatPage() {

  return (
    <PageLayout className="!pt-4">
      <PremiumBadge/>
      <ConvertPanel/>
    </PageLayout>
  )
}
