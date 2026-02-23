'use client'

import { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ApexOptions } from 'apexcharts'
import { KSpinner } from 'kku-ui'
import { useLottie } from 'lottie-react'
import { MarketChartIntervalTypeList } from '@/components/features/overview/miningMetricChart/MiningMetricChart.interface'
import type { MiningMetricChartIntervalType } from '@/shared/stores/store.interface'
import { CountText, UpdownIcon } from '@/components'
import { ChartChanger } from '@/components/features/overview'
import { useMiningMetricChartData } from '@/shared/query'
import { formatDifficulty, formatHashrate } from '@/shared/utils/number'
import LightningLottieData from '@/shared/assets/lottie/lightning.json'
import useStore from '@/shared/stores/store'


/*
* 해시레이트 모든 차트는 데이터 크기가 많아 시간기반 균일 샘플링으로 최적화(64%) 했으나,
* 시간이 지날수록 데이터가 계속 늘어나므로 최적화 양을 늘리거나 알고리즘 변화가 필요함.
*  */

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

const miningMetricChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: '3M', value: '3m' },
  { text: '1Y', value: '1y' },
  { text: '3Y', value: '3y' },
  { text: 'All', value: 'all' },
]


export default function MiningMetricChart() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart)
  const miningMetricChartInterval = useStore(state => state.miningMetricChartInterval)
  const setHashrateChartInterval = useStore(state => state.setMiningMetricChartInterval)
  const { data, isLoading } = useMiningMetricChartData(miningMetricChartInterval)
  const isDark = useStore(store => store.theme) === 'dark'

  const { View: lightningLottie } = useLottie({
    animationData: LightningLottieData,
    loop: true,
  })

  /**
   * 차트 타입에 따른 데이터 반환
   */
  const chartRowData = useMemo(() => {
    if (!data) return { value: [] as number[], date: [] as number[] }
    if (overviewChart === 'hashrate') return data.hashrates
    if (overviewChart === 'difficulty') return data.difficulty

    // 예외 발생 대신 빈 데이터 반환
    console.error('Invalid overview chart type:', overviewChart)
    return { value: [] as number[], date: [] as number[] }
  }, [overviewChart, data])

  const seriesData = useMemo(() => {
    if (!chartRowData.date?.length) return []
    // mempool.space 타임스탬프는 초 단위 → ApexCharts datetime은 ms 단위
    return chartRowData.date.map((timestamp, idx) => ({
      x: timestamp * 1000,
      y: chartRowData.value[idx],
    }))
  }, [chartRowData])

  /**
   * 최대값 인덱스를 한 번의 순회로 계산
   */
  const maxValueIndex = useMemo(() => {
    const values = chartRowData.value
    if (!values.length) return -1
    return values.reduce((maxIdx, val, idx, arr) =>
      val > arr[maxIdx] ? idx : maxIdx, 0)
  }, [chartRowData])

  const maxValue = useMemo(() =>
    chartRowData.value[maxValueIndex] ?? 0,
  [chartRowData, maxValueIndex])

  /**
   * 현재값 대비 최대값의 변화율 계산
   */
  const percentage = useMemo(() => {
    if (!data) return 0
    const factor = 10 ** 2
    const targetCurrentValue = overviewChart === 'hashrate' ? data.currentHashrate : data.currentDifficulty
    const percentValue = (targetCurrentValue - maxValue) / Math.abs(targetCurrentValue) * 100
    return Math.floor(percentValue * factor) / factor
  }, [data, maxValue, overviewChart])

  const allTimeHighValue = useMemo(() => {
    if (!data) return ''
    if (overviewChart === 'hashrate') return `Hashrate: ${formatHashrate(data.currentHashrate || 0)}`
    if (overviewChart === 'difficulty') return `Difficulty: ${formatDifficulty(data.currentDifficulty || 0)}`
    return ''
  }, [data, overviewChart])

  const maxPoint = useMemo(() => {
    if (!seriesData.length || maxValueIndex < 0) return null
    return seriesData[maxValueIndex]
  }, [seriesData, maxValueIndex])

  const chartOptions = useMemo<ApexOptions>(() => {
    const formatter = (val: number) => overviewChart === 'hashrate'
      ? formatHashrate(val)
      : formatDifficulty(val)

    return {
      chart: {
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        animations: { enabled: false },
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      colors: [isDark ? '#ffffff' : '#000000'],
      stroke: { curve: 'smooth', width: 1.8 },
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
        y: { formatter },
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
            text: overviewChart === 'hashrate'
              ? formatHashrate(maxPoint.y)
              : formatDifficulty(maxPoint.y),
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
    }
  }, [isDark, overviewChart, maxPoint])
  // endregion


  // region [Privates]
  /**
   * 차트 기간 버튼의 스타일 클래스를 생성
   */
  const getButtonClass = useCallback((value: MiningMetricChartIntervalType) => {
    const isActive = miningMetricChartInterval === value
    const baseClass = 'h-[30px] px-3 border-none text-sm rounded-md transition-all'
    const stateClass = isActive
      ? 'font-bold text-white bg-black/40 dark:bg-white/80 dark:text-black'
      : 'text-current hover:bg-gray-100 dark:hover:bg-gray-800'
    return `${baseClass} ${stateClass}`
  }, [miningMetricChartInterval])
  // endregion


  return (
    // .mining-metric-chart
    <div
      className="relative flex flex-col justify-between gap-2 w-[calc(100%+1rem)] p-0 -mx-2 border-none select-none overflow-hidden">

      {/* .mining-metric-chart__top */}
      <div className="flex flex-col justify-start gap-2 text-current relative">
        <div className="flex justify-start items-center px-2">
          {/* .mining-metric-chart__top__left__area */}
          <div className="flex gap-2 relative">
            <span className="text-base font-number font-bold">
              {allTimeHighValue}
            </span>

            {data && percentage === 0 && (
              <div className="absolute top-1/2 -right-8 -translate-y-[46%] flex justify-center items-center w-10 h-10">
                {lightningLottie}
              </div>
            )}

            {Math.abs(percentage) > 0.01 && (
              <span className="flex justify-center items-center gap-0.5 font-number font-bold text-[12px] leading-4">
                <UpdownIcon isUp={percentage > 0}/>
                <CountText value={percentage} decimals={2}/>%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* .mining-metric-chart__middle */}
      <div className="relative z-[3]">
        {isLoading ? (
          <div className="flex justify-center items-center aspect-[2/1]">
            <KSpinner color="#F7931A"/>
          </div>
        ) : (
          <ReactApexChart
            type="area"
            series={[{ name: overviewChart === 'hashrate' ? 'Hashrate' : 'Difficulty', data: seriesData }]}
            options={chartOptions}
            height={185}
            width="100%"
          />
        )}
      </div>

      {/* .mining-metric-chart__bottom */}
      <div className="flex justify-between items-center pt-3 px-2">
        <div className="flex justify-center items-center gap-8 w-full pl-3 py-1">
          {miningMetricChartIntervalOptions.map(({ value, text }) => (
            <button type="button" key={value} className={getButtonClass(value)}
                    onClick={() => setHashrateChartInterval(value)}>
              {text}
            </button>
          ))}
        </div>
        <ChartChanger/>
      </div>
    </div>
  )
}
