
import {BlockHalvingCard, MiningMetricChart, MacroWidgetPanel, MarketChart, PricePanel} from '@/pages/overviewPage/components'
import useStore from '@/shared/stores/store'
import {PageLayout} from '@/layouts'


export default function OverviewPage() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  // endregion

  return (
    <PageLayout className="overview-page__area">
      <PricePanel/>
      <MacroWidgetPanel />
      {overviewChart === 'price' && <MarketChart/>}
      {['hashrate', 'difficulty'].includes(overviewChart) && <MiningMetricChart/>}
      <BlockHalvingCard/>
    </PageLayout>
  )
}