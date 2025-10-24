import {useOutletContext} from 'react-router'
import {usePageAnimation} from '@/shared/hooks'
import {UsePageAnimation} from '@/shared/hooks/usePageAnimation'
import {BlockHalvingCard, HashrateChart, MacroCard, MarketChart, PricePannel} from '@/pages/overviewPage/components'
import useStore from '@/shared/stores/store'
import {PageLayout} from '@/layouts'


export default function OverviewPage() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  usePageAnimation(useOutletContext<UsePageAnimation>())
  // endregion

  return (
    <PageLayout className="overview-page__area">
      <PricePannel/>
      <MacroCard/>
      <BlockHalvingCard/>
      {overviewChart === 'price' && (<MarketChart/>)}
      {overviewChart === 'hashrate' && (<HashrateChart/>)}
    </PageLayout>
  )
}
