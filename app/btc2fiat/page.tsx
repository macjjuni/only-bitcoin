import { ConvertPanel, PremiumBadge } from '@/app/btc2fiat/components'
import { PageLayout } from '@/layouts'


export default function Btc2FiatPage() {

  return (
    <PageLayout className="!pt-4">
      <PremiumBadge/>
      <ConvertPanel/>
    </PageLayout>
  )
}
