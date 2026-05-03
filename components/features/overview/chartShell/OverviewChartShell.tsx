'use client'

import { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { KSpinner } from 'kku-ui'
import useStore from '@/shared/stores/store'
import { ChartChanger } from '@/components/features/overview'
import { createChartOptions } from '@/components/features/overview/chartShell/createChartOptions'
import type { OverviewChartShellProps } from '@/components/features/overview/chartShell/OverviewChartShell.interface'


const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })


export default function OverviewChartShell<T extends string | number>({
  seriesName,
  seriesData,
  isLoading,
  formatter,
  intervalOptions,
  currentInterval,
  onChangeInterval,
  strokeWidth,
  fillOpacityTo,
  fillStops,
  chartHeight,
  topSlot,
  loadingClassName,
}: OverviewChartShellProps<T>) {

  // region [Hooks]
  const isDark = useStore(store => store.theme) === 'dark'

  const maxPointIndex = useMemo(() => {
    if (!seriesData.length) return -1
    return seriesData.reduce((maxIdx, item, idx, arr) =>
      item.y > arr[maxIdx].y ? idx : maxIdx, 0)
  }, [seriesData])

  const maxPoint = useMemo(() => {
    if (maxPointIndex < 0 || !seriesData[maxPointIndex]) return null
    return seriesData[maxPointIndex]
  }, [maxPointIndex, seriesData])

  const chartOptions = useMemo(() => createChartOptions({
    isDark,
    formatter,
    maxPoint,
    strokeWidth,
    fillOpacityTo,
    fillStops,
  }), [isDark, formatter, maxPoint, strokeWidth, fillOpacityTo, fillStops])
  // endregion


  // region [Privates]
  /**
   * 차트 기간 버튼의 스타일 클래스를 생성
   */
  const getButtonClass = useCallback((value: T) => {
    const isActive = currentInterval === value
    const baseClass = 'h-[30px] px-3 border-none text-sm rounded-md transition-all'
    const stateClass = isActive
      ? 'font-bold text-white bg-black/40 dark:bg-white/80 dark:text-black'
      : 'text-current hover:bg-gray-100 dark:hover:bg-gray-800'

    return `${baseClass} ${stateClass}`
  }, [currentInterval])
  // endregion


  return (
    <div
      className="relative flex flex-col justify-between gap-2 -mx-2 w-[calc(100%+1rem)] select-none overflow-hidden">

      {topSlot}

      <div className="relative w-full" style={{ height: chartHeight }}>
        {isLoading ? (
          <div className={loadingClassName ?? 'flex justify-center items-center w-full h-full'}>
            <KSpinner color="#F7931A"/>
          </div>
        ) : (
          <ReactApexChart
            type="area"
            series={[{ name: seriesName, data: seriesData }]}
            options={chartOptions}
            height={chartHeight}
            width="100%"
          />
        )}
      </div>

      <div className="relative flex justify-between items-center px-2">
        <div className="flex justify-center items-center gap-8 w-full pl-3 py-1">
          {intervalOptions.map(({ value, text }) => (
            <button type="button" key={String(value)} className={getButtonClass(value)}
                    onClick={() => onChangeInterval(value)}>
              {text}
            </button>
          ))}
        </div>
        <ChartChanger/>
      </div>
    </div>
  )
}
