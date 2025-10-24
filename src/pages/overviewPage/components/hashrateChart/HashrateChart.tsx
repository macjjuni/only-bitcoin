import React, {memo, useCallback, useEffect, useMemo, useRef} from 'react'
import {Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip} from 'chart.js'
import {KButton, KButtonGroup, KIcon, KSpinner} from 'kku-ui'
import {Line} from 'react-chartjs-2'
import {
  ChartJsDataType,
  MarketChartIntervalTypeList,
} from '@/pages/overviewPage/components/hashrateChart/HashrateChart.interface'
import {HashrateChartIntervalType} from '@/shared/stores/store.interface'
import useStore from '@/shared/stores/store'
import {CountText, HorizontalCard, UpdownIcon} from '@/components'
import {useHashrateChartData} from '@/shared/api'
import {formatHashrate} from '@/shared/utils/number'
import {removeSpaces} from '@/shared/utils/string'
import './HashrateChart.scss'
import {ChartChanger} from '@/pages/overviewPage/components'


// Chart.js 컴포넌트 등록
ChartJS.register(LinearScale, PointElement, Tooltip, LineElement)

const hashrateChartIntervalOptions: MarketChartIntervalTypeList[] = [
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
* 해시레이트 모든 차트는 데이터 크기가 많아 시간기반 균일 샘플링으로 최적화(45%) 처리를 했으나,
* 시간이 지날수록 데이터가 계속 늘어나므로 최적화 양을 늘리거나 알고리즘 변화가 필요함.
*  */

const HashrateChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const chartBottomRef = useRef<HTMLDivElement>(null)

  const hashrateChartInterval = useStore(state => state.hashrateChartInterval)
  const setHashrateChartInterval = useStore(state => state.setHashrateChartInterval)
  const {data, isLoading} = useHashrateChartData(hashrateChartInterval)

  const isDark = useStore(store => store.theme) === 'dark'

  const maxValueIndex = useMemo(() => {
    const dataList = data?.hashrates.value || []
    const maxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity)

    return dataList.indexOf(maxValue)
  }, [data, hashrateChartInterval])

  const currentChartData = useMemo((): ChartJsDataType => ({

    labels: data?.hashrates.date.map((timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()) || [],
    datasets: [getChartDataset(data?.hashrates.value || [], maxValueIndex, isDark)],
  }), [data, hashrateChartInterval, maxValueIndex])

  const maxValue = useMemo(() => (
    currentChartData.datasets[0].data[maxValueIndex]
  ), [currentChartData, maxValueIndex])

  const percentage = useMemo(() => {

    if (!data) {
      return 0
    }
    const factor = 10 ** 2
    const percentValue = (data.currentHashrate - maxValue) / Math.abs(data.currentHashrate) * 100

    return Math.floor(percentValue * factor) / factor
  }, [data?.currentHashrate, maxValue])
  // endregion


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

    if (currentChartData.labels.length > 0 && chartRef.current) {
      chartRef.current?.tooltip?.setActiveElements([{datasetIndex: 0, index: maxValueIndex}], {x: 0, y: 0})
      chartRef.current?.update()
    }
    // }, 300);
  }, [maxValueIndex, currentChartData])
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: HashrateChartIntervalType) => {

    const clazz = ['hashrate-chart__button']

    if (hashrateChartInterval === value) {
      clazz.push('hashrate-chart__button--active')
    }

    return clazz.join(' ')
  }, [hashrateChartInterval])

  const xAxisValue = useMemo(() => {
    if (!data) {
      return {first: '-', middle: '-', last: '-'}
    }

    const dateList = data.hashrates.date
    const firstItem = dateList[0]
    const middleItem = dateList[Math.floor(dateList.length / 2)]
    const lastItem = dateList[dateList.length - 1]

    return {
      first: getFormatDate(firstItem),
      middle: getFormatDate(middleItem),
      last: getFormatDate(lastItem),
    }
  }, [data])
  // endregion

  // region [Templates]
  const TopLogoArea = useMemo(() => (
    <div className="hashrate-chart__top__fist__logo">
      <KIcon icon="bitcoin" color={isDark ? '#fff' : '#000'} size={33}/>
      <p className="hashrate-chart__top__wrapper__text__area">
        <span className="hashrate-chart__top__wrapper__text__area--top">Bitcoin</span>
        <span className="hashrate-chart__top__wrapper__text__area--bottom">Hashrate</span>
      </p>
    </div>
  ), [])


  const ButtonIntervalArea = useMemo(() => (
    <KButtonGroup className="hashrate-chart__top__first__button-area">
      {
        hashrateChartIntervalOptions.map(({value, text}) => (
          <KButton key={value} label={text} size="small" className={chartCardButtonClass(value)}
                   onClick={() => setHashrateChartInterval(value)}/>
        ))
      }
    </KButtonGroup>
  ), [setHashrateChartInterval, chartCardButtonClass])


  const ChartArea = useMemo(() => (
    <>
      <Line ref={chartRef} data={currentChartData} height="120%"
            className="hashrate-chart__chart__wrapper__body"
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
                  callbacks: {label: (e) => `${formatHashrate(e.raw as number)}`},
                },
              },
              elements: {point: {radius: 0}, line: {tension: 0.2, borderWidth: 2}},
              scales: {
                x: {display: false},
                y: {display: false, suggestedMax: maxValue * 1.014},
              },
              animation: false,
            }}
      />
      <div className="hashrate-chart__chart__wrapper__line__area">
        {Array.from({length: 16}, (_, i) => (
          <span key={i} style={{'left': `${(i + 1) * 6.25}%`}}
                className="hashrate-chart__chart__wrapper__line__area--line"/>
        ))}
      </div>
    </>
  ), [maxValue, currentChartData])
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    initializeBlankHeight()
  }, [])

  useEffect(() => {
    // console.log(data?.hashrates)
    if (chartRef?.current) {
      initializeTooltip()
    }
  }, [initializeTooltip])
  // endregion

  return (
    <HorizontalCard ref={cardRef} className="hashrate-chart" rows={2}>
      <div className="hashrate-chart__top">
        <div className="hashrate-chart__top__fist">
          {TopLogoArea}
          {ButtonIntervalArea}
        </div>
        <div className="hashrate-chart__top__second">
          <div className="hashrate-chart__top__second__area">
            <span className="hashrate-chart__top__second__area__value">
              {formatHashrate(data?.currentHashrate || 0)}
            </span>

            <span className="hashrate-chart__top__second__area__rate">
              <UpdownIcon isUp={percentage > 0}/>
              <CountText value={percentage} decimals={2}/>%
            </span>
          </div>

          <ChartChanger/>
        </div>
      </div>

      <div ref={chartBottomRef} className="hashrate-chart__bottom">
        {isLoading && <KSpinner className="hashrate-chart__bottom__spinner"/>}
        {
          !isLoading && (
            <>
              {ChartArea}
              <div className="hashrate-chart__bottom__x">
                <span className="hashrate-chart__bottom__x__first">{xAxisValue.first}</span>
                <span className="hashrate-chart__bottom__x__middle">{xAxisValue.middle}</span>
                <span className="hashrate-chart__bottom__x__last">{xAxisValue.last}</span>
              </div>
            </>
          )
        }
      </div>
    </HorizontalCard>
  )
}


export default memo(HashrateChart)
