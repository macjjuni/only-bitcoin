'use client'

import { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import { KSpinner } from 'kku-ui'
import { MarketChartIntervalTypeList } from '@/components/features/overview/marketChart/MarketChart.interface'
import { MarketChartIntervalType } from '@/shared/stores/store.interface'
import useStore from '@/shared/stores/store'
import { useMarketChartData } from '@/shared/query'
import { ChartChanger } from '@/components/features/overview'


const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const marketChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: '1D', value: 1 },
  { text: '1W', value: 7 },
  { text: '1M', value: 30 },
  { text: '1Y', value: 365 },
]


export default function MarketChart() {

  // region [Hooks]
  const marketChartInterval = useStore(state => state.marketChartInterval)
  const setMarketChartInterval = useStore(state => state.setMarketChartInterval)
  const { marketChartData, isLoading } = useMarketChartData(marketChartInterval)
  const isDark = useStore(store => store.theme) === 'dark'

  const seriesData = useMemo(() => {
    if (!marketChartData?.date?.length) return []
    return marketChartData.date.map((timestamp, idx) => ({
      x: timestamp,
      y: marketChartData.price[idx],
    }))
  }, [marketChartData])

  /**
   * 최대값 인덱스를 한 번의 순회로 계산
   */
  const maxPointIndex = useMemo(() => {
    if (!seriesData.length) return -1
    return seriesData.reduce((maxIdx, item, idx, arr) =>
      item.y > arr[maxIdx].y ? idx : maxIdx, 0)
  }, [seriesData])

  const maxPoint = useMemo(() => {
    if (maxPointIndex < 0 || !seriesData[maxPointIndex]) return null
    return seriesData[maxPointIndex]
  }, [maxPointIndex, seriesData])

  const chartOptions = useMemo<ApexOptions>(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      background: 'transparent',
      animations: { enabled: false },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: [isDark ? '#ffffff' : '#000000'],
    stroke: { curve: 'smooth', width: 1.48 },
    fill: {
      type: 'gradient',
      colors: ['#f7931a'],
      gradient: {
        shadeIntensity: 1,
        opacityFrom: isDark ? 0.66 : 0.7,
        opacityTo: isDark ? 0.06 : 0.9,
        stops: [0, 80]
      },
    },
    markers: {
      size: 0,
      colors: ['#f7931a'],
      hover: { size: 4, sizeOffset: 0 },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x: {
        show: true,
        format: 'yyyy.MM.dd',
      },
      y: { formatter: (val: number) => `$${Math.floor(val).toLocaleString()}` },
      marker: { show: false },
      style: { fontSize: '12px', fontFamily: 'Roboto Mono' },
    },
    xaxis: {
      type: 'datetime',
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        stroke: {
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          width: 1,
          dashArray: 3,
        },
      },
      tooltip: { enabled: false },
    },
    yaxis: { show: false },
    grid: {
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0, top: -10, bottom: 0 },
    },
    dataLabels: { enabled: false },
    annotations: maxPoint ? {
      points: [{
        x: maxPoint.x,
        y: maxPoint.y,
        marker: {
          size: 4,
          fillColor: '#f7931a',
          strokeColor: '#fff',
          strokeWidth: 2,
        },
        label: {
          text: `$${Math.floor(maxPoint.y).toLocaleString()}`,
          borderColor: isDark ? '#fff' : '#000',
          borderWidth: 1,
          borderRadius: 4,
          fontFamily: 'Roboto Mono',
          style: {
            background: isDark ? 'hsl(0 0% 7.1%)' : '#fff',
            color: isDark ? '#fff' : '#000',
            fontSize: '12px',
            fontWeight: 600,
            padding: {
              left: 8,
              right: 8,
              top: 3,
              bottom: 4,
            },
          },
        },
      }],
    } : undefined,
  }), [isDark, maxPoint])
  // endregion


  // region [Privates]
  /**
   * 차트 기간 버튼의 스타일 클래스를 생성
   */
  const getButtonClass = useCallback((value: MarketChartIntervalType) => {
    const isActive = marketChartInterval === value
    const baseClass = 'h-[30px] px-3 border-none text-sm rounded-md transition-all'
    const stateClass = isActive
      ? 'font-bold text-white bg-black/40 dark:bg-white/80 dark:text-black'
      : 'text-current hover:bg-gray-100 dark:hover:bg-gray-800'

    return `${baseClass} ${stateClass}`
  }, [marketChartInterval])
  // endregion


  return (
    <div className="relative flex flex-col justify-between gap-2 -mx-2 w-[calc(100%+1rem)] select-none overflow-hidden">

      <div className="relative w-full h-[200px]">
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full">
            <KSpinner color="#F7931A"/>
          </div>
        ) : (
          <ReactApexChart
            type="area"
            series={[{ name: 'Price', data: seriesData }]}
            options={chartOptions}
            height={200}
            width="100%"
          />
        )}
      </div>

      {/* .market-chart__bottom */}
      <div className="relative flex justify-between items-center px-2">
        {/* .market-chart__bottom__buttons */}
        <div className="flex justify-center items-center gap-8 w-full pl-3 py-1">
          {marketChartIntervalOptions.map(({ value, text }) => (
            <button type="button" key={value} className={getButtonClass(value)}
                    onClick={() => setMarketChartInterval(value)}>
              {text}
            </button>
          ))}
        </div>
        <ChartChanger/>
      </div>
    </div>
  )
}
