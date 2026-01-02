'use client'

import { useCallback } from 'react'
import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuGroup,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
} from 'kku-ui'
import { ChartNoAxesCombined } from 'lucide-react'
import useStore from '@/shared/stores/store'
import { OverviewChartType } from '@/shared/stores/store.interface'


const overviewChartOptions = [
  { label: '가격', value: 'price' },
  { label: '난이도', value: 'difficulty' },
  { label: '해시레이트', value: 'hashrate' },
] as const

export default function ChartChanger() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  const setOverviewChart = useStore(store => store.setOverviewChart)
  // endregion


  // region [Events]
  const onClickMenuItem = useCallback((chart: OverviewChartType) => {
    setOverviewChart(chart)
  }, [])
  // endregion

  return (
    <KDropdownMenu>
      <KDropdownMenuTrigger
        className={[
          'p-[3px] rounded-lg transition-colors duration-150',
          'data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-gray-800',
        ].join(' ')}
      >
        <ChartNoAxesCombined/>
      </KDropdownMenuTrigger>

      <KDropdownMenuContent align="end" side="top" sideOffset={12}>
        <KDropdownMenuLabel>차트 선택</KDropdownMenuLabel>
        <KDropdownMenuGroup>
          {overviewChartOptions.map(item => (
            <KDropdownMenuCheckboxItem
              key={item.value}
              checked={item.value === overviewChart}
              onClick={() => onClickMenuItem(item.value)}
            >
              {item.label}
            </KDropdownMenuCheckboxItem>
          ))}
        </KDropdownMenuGroup>
      </KDropdownMenuContent>
    </KDropdownMenu>
  )
}