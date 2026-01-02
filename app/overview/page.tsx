'use client';

import {
  BlockHalvingCard,
  MacroWidgetPanel,
  MarketChart,
  MiningMetricChart,
  PricePanel,
} from './components';
import { PageLayout } from '@/layouts'
import useStore from '@/shared/stores/store'

export default function OverviewPage() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  // endregion

  return (
    <PageLayout>
      <PricePanel/>
      <MacroWidgetPanel/>
      {overviewChart === 'price' && <MarketChart/>}
      {['hashrate', 'difficulty'].includes(overviewChart) && <MiningMetricChart/>}
      <BlockHalvingCard/>
    </PageLayout>
  )
}
