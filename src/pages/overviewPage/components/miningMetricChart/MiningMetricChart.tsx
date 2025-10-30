import React, {memo, useCallback, useEffect, useMemo, useRef} from 'react'
import {Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip} from 'chart.js'
import {KButton, KButtonGroup, KIcon, KSpinner} from 'kku-ui'
import {Line} from 'react-chartjs-2'
import {useLottie} from 'lottie-react'
import {
  ChartJsDataType,
  MarketChartIntervalTypeList,
} from '@/pages/overviewPage/components/miningMetricChart/MiningMetricChart.interface'
import type {MiningMetricChartIntervalType} from '@/shared/stores/store.interface'
import {CountText, HorizontalCard, UpdownIcon} from '@/components'
import {ChartChanger} from '@/pages/overviewPage/components'
import {useMiningMetricChartData} from '@/shared/api'
import {formatDifficulty, formatHashrate} from '@/shared/utils/number'
import {removeSpaces} from '@/shared/utils/string'
import useStore from '@/shared/stores/store'
import LightningLottieData from '@/shared/assets/lottie/lightning.json'
import './MiningMetricChart.scss'


// Chart.js 컴포넌트 등록
ChartJS.register(LinearScale, PointElement, Tooltip, LineElement)

const miningMetricChartIntervalOptions: MarketChartIntervalTypeList[] = [
  {text: '3M', value: '3m'},
  {text: '1Y', value: '1y'},
  {text: '3Y', value: '3y'},
  {text: 'All', value: 'all'},
]

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: '', data, borderColor: isDark ? '#fff' : '#000', backgroundColor: 'transparent',
  borderWidth: 2, pointBackgroundColor: '#f7931a',
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)), // 최댓값 위치에 점 표시
})

/*
* 해시레이트 모든 차트는 데이터 크기가 많아 시간기반 균일 샘플링으로 최적화(64%) 했으나,
* 시간이 지날수록 데이터가 계속 늘어나므로 최적화 양을 늘리거나 알고리즘 변화가 필요함.
*  */

const MiningMetricChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const chartBottomRef = useRef<HTMLDivElement>(null)

  const overviewChart = useStore(store => store.overviewChart)
  const miningMetricChartInterval = useStore(state => state.miningMetricChartInterval)
  const setHashrateChartInterval = useStore(state => state.setMiningMetricChartInterval)
  const {data, isLoading} = useMiningMetricChartData(miningMetricChartInterval)

  const {View: lightningLottie, animationItem: lightningLottieRef} = useLottie({
    animationData: LightningLottieData,
    loop: true,
  })
  const isDark = useStore(store => store.theme) === 'dark'

  const ChartRowData = useMemo(() => {

    if (!data) {
      return {value: [], date: []}
    }

    if (overviewChart === 'hashrate') {
      return data.hashrates
    } else if (overviewChart === 'difficulty') {
      return data.difficulty
    } else {
      throw Error('Invalid overview chart.')
    }
  }, [overviewChart, data])

  const MaxValueIndex = useMemo(() => {
    const dataList = ChartRowData.value || []
    const MaxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity)

    return dataList.indexOf(MaxValue)
  }, [ChartRowData, miningMetricChartInterval])

  const CurrentChartData = useMemo((): ChartJsDataType => ({

    labels: ChartRowData.date.map((timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()) || [],
    datasets: [getChartDataset(ChartRowData.value || [], MaxValueIndex, isDark)],
  }), [ChartRowData, miningMetricChartInterval, MaxValueIndex])

  const MaxValue = useMemo(() => (CurrentChartData.datasets[0].data[MaxValueIndex]), [CurrentChartData, MaxValueIndex])
  const Percentage = useMemo(() => {

    if (!data) {
      return 0
    }
    const factor = 10 ** 2
    const targetCurrentValue = overviewChart === 'hashrate' ? data.currentHashrate : data.currentDifficulty
    const percentValue = (targetCurrentValue - MaxValue) / Math.abs(targetCurrentValue) * 100

    return Math.floor(percentValue * factor) / factor
  }, [data, MaxValue])

  const AllTimeHighValue = useMemo(() => {
    if (overviewChart === 'hashrate') {
      return formatHashrate(data?.currentHashrate || 0)
    } else if (overviewChart === 'difficulty') {
      return formatDifficulty(data?.currentDifficulty || 0)
    } else {
      throw Error('Invalid overviewChart.')
    }
  }, [overviewChart])
  // endregion
  useEffect(() => {
    console.log('AllTimeHighValue', AllTimeHighValue)
  }, [AllTimeHighValue])

  // region [Privates]
  const getFormatDate = useCallback((timestamp: number) => {
    const dateStr = new Date(timestamp * 1000).toLocaleDateString()
    const sanitizedStrArr = removeSpaces(dateStr).split('.')

    return `${sanitizedStrArr[0]}.${sanitizedStrArr[1]}`
  }, [])

  const initializeBlankHeight = useCallback(() => {
    if (!chartBottomRef?.current) {
      return
    }
    if (!cardRef?.current) {
      chartBottomRef.current.style.setProperty('height', 'auto')
      return
    }
    chartBottomRef.current.style.setProperty('height', `${cardRef.current.clientWidth * 0.444}px`)
  }, [])

  const initializeTooltip = useCallback(() => {

    if (CurrentChartData.labels.length > 0 && chartRef.current) {
      chartRef.current?.tooltip?.setActiveElements([{datasetIndex: 0, index: MaxValueIndex}], {x: 0, y: 0})
      chartRef.current?.update()
    }
    // }, 300);
  }, [MaxValueIndex, CurrentChartData])

  const initializeLottieSpeed = useCallback(() => {
    if (!lightningLottieRef) { return; }
    lightningLottieRef?.setSpeed(0.5);
  }, [lightningLottieRef])
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: MiningMetricChartIntervalType) => {

    const clazz = ['mining-metric-chart__button']

    if (miningMetricChartInterval === value) {
      clazz.push('mining-metric-chart__button--active')
    }

    return clazz.join(' ')
  }, [miningMetricChartInterval])

  const xAxisValue = useMemo(() => {
    if (!data) {
      return {first: '-', middle: '-', last: '-'}
    }

    const dateList = ChartRowData.date
    const firstItem = dateList[0]
    const middleItem = dateList[Math.floor(dateList.length / 2)]
    const lastItem = dateList[dateList.length - 1]

    return {
      first: getFormatDate(firstItem),
      middle: getFormatDate(middleItem),
      last: getFormatDate(lastItem),
    }
  }, [ChartRowData])
  // endregion

  // region [Templates]
  const LightningLottie = useMemo(() => (
     <div className="mining-metric-chart__top__second__area__ath-lottie" style={{ display: Percentage === 0 ? 'flex': 'none'}}>
       {lightningLottie}
     </div>
  ), [Percentage, lightningLottie])

  const TopLogoArea = useMemo(() => (
    <div className="mining-metric-chart__top__fist__logo">
      <KIcon icon="bitcoin" color={isDark ? '#fff' : '#000'} size={33}/>
      <p className="mining-metric-chart__top__wrapper__text__area">
        <span className="mining-metric-chart__top__wrapper__text__area--top">Bitcoin</span>
        <span
          className="mining-metric-chart__top__wrapper__text__area--bottom">{overviewChart.charAt(0).toUpperCase() + overviewChart.slice(1)}</span>
      </p>
    </div>
  ), [overviewChart])


  const ButtonIntervalArea = useMemo(() => (
    <KButtonGroup className="mining-metric-chart__top__first__button-area">
      {
        miningMetricChartIntervalOptions.map(({value, text}) => (
          <KButton key={value} label={text} size="small" className={chartCardButtonClass(value)}
                   onClick={() => setHashrateChartInterval(value)}/>
        ))
      }
    </KButtonGroup>
  ), [chartCardButtonClass])


  const ChartArea = useMemo(() => (
    <>
      <Line ref={chartRef} data={CurrentChartData} height="120%"
            className="mining-metric-chart__chart__wrapper__body"
            options={{
              plugins: {
                legend: {display: false},
                decimation: {
                  enabled: true,
                  algorithm: 'lttb',
                  samples: 1,
                },
                tooltip: {
                  enabled: true,
                  usePointStyle: true,
                  caretPadding: 6,
                  backgroundColor: 'rgba(0, 0, 0, 0.72)',
                  callbacks: {
                    label: (e) => `${
                      overviewChart === 'hashrate' ? formatHashrate(e.raw as number) : formatDifficulty(e.raw as number)
                    }`,
                  },
                },
              },
              elements: {point: {radius: 0}, line: {tension: 0.2, borderWidth: 2}},
              scales: {
                x: {display: false},
                y: {display: false, suggestedMax: MaxValue * 1.014},
              },
              animation: false,
            }}
      />
      <div className="mining-metric-chart__chart__wrapper__line__area">
        {Array.from({length: 16}, (_, i) => (
          <span key={i} style={{'left': `${(i + 1) * 6.25}%`}}
                className="mining-metric-chart__chart__wrapper__line__area--line"/>
        ))}
      </div>
    </>
  ), [MaxValue, CurrentChartData])
  // endregion


  // region [Life Cycles]
  useEffect(() => { initializeBlankHeight(); }, []);
  useEffect(() => { initializeLottieSpeed(); }, [initializeLottieSpeed]);
  useEffect(() => {
    if (chartRef?.current) { initializeTooltip(); }
  }, [initializeTooltip]);
  // endregion

  return (
    <HorizontalCard ref={cardRef} className="mining-metric-chart" rows={2}>
      <div className="mining-metric-chart__top">
        <div className="mining-metric-chart__top__fist">
          {TopLogoArea}
          {ButtonIntervalArea}
        </div>
        <div className="mining-metric-chart__top__second">
          <div className="mining-metric-chart__top__second__area">
            <span className="mining-metric-chart__top__second__area__value">
              {AllTimeHighValue}
            </span>
            {LightningLottie}
            {Percentage !== 0 && (
                <span className="mining-metric-chart__top__second__area__rate">
                  <UpdownIcon isUp={Percentage > 0}/>
                  <CountText value={Percentage} decimals={2}/>%
                </span>
            )}
          </div>

          <ChartChanger/>
        </div>
      </div>

      <div ref={chartBottomRef} className="mining-metric-chart__bottom">
        {isLoading && <KSpinner className="mining-metric-chart__bottom__spinner"/>}
        {
          !isLoading && (
            <>
              {ChartArea}
              <div className="mining-metric-chart__bottom__x">
                <span className="mining-metric-chart__bottom__x__first">{xAxisValue.first}</span>
                <span className="mining-metric-chart__bottom__x__middle">{xAxisValue.middle}</span>
                <span className="mining-metric-chart__bottom__x__last">{xAxisValue.last}</span>
              </div>
            </>
          )
        }
      </div>
    </HorizontalCard>
  )
}


export default memo(MiningMetricChart)
