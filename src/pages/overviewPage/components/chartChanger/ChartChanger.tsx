import {memo, useCallback} from 'react'
import {KDropdown, KMenu} from 'kku-ui'
import {DataIcon} from '@/components/icon'
import useStore from '@/shared/stores/store'


const overviewChartOptions = [
  {label: 'Hashrate', value: 'hashrate'},
  {label: 'Price', value: 'price'},
] as const

const ChartChanger = () => {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  const setOverviewChart = useStore(store => store.setOverviewChart)
  // endregion

  // region [Events]
  const onClickMenuItem = useCallback((chart: 'hashrate' | 'price') => {
    setOverviewChart(chart)
  }, [])
  // endregion

  return (
    <div>
      <KDropdown trigger="click" position="left-start">
        <KDropdown.Trigger className="remove-highlight" style={{cursor: 'pointer'}}>
          <DataIcon size={20} style={{ padding: 2 }} />
        </KDropdown.Trigger>
        <KDropdown.Content zIndex={6} offset={{x: -6, y: -2}}>
          <KMenu size="small">
            {
              overviewChartOptions.map(item => (
                <KMenu.ItemSelectable
                  key={item.value} selected={item.value === overviewChart}
                  label={item.label} onClick={() => {
                  onClickMenuItem(item.value)
                }}
                />
              ))
            }
          </KMenu>
        </KDropdown.Content>
      </KDropdown>
    </div>
  )
}

export default memo(ChartChanger)
