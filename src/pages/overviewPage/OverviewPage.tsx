import {useMemo} from 'react'
import {useOutletContext} from 'react-router'
import {usePageAnimation} from '@/shared/hooks'
import {UsePageAnimation} from '@/shared/hooks/usePageAnimation'
import {BlockHalvingCard, MiningMetricChart, MacroWidgetPanel, MarketChart, PricePannel} from '@/pages/overviewPage/components'
import useStore from '@/shared/stores/store'
import {PageLayout} from '@/layouts'


export default function OverviewPage() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  usePageAnimation(useOutletContext<UsePageAnimation>())
  // endregion

  // region [Templates]
  const OverviewChart = useMemo(() => {
    if (overviewChart === 'price'){ return (<MarketChart/>) }
    if (['hashrate', 'difficulty'].includes(overviewChart)) { return (<MiningMetricChart/>) }
  }, [overviewChart]);
  // endregion
  return (
    <PageLayout className="overview-page__area">
      <PricePannel/>
      <MacroWidgetPanel />
      {/* <MacroCard/> */}


      <BlockHalvingCard/>
      {OverviewChart}
    </PageLayout>
  )
}
