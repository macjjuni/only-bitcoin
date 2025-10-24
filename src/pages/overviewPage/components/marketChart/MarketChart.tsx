import React, {memo, useCallback, useMemo, useRef} from 'react'
import {CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip} from 'chart.js'
import {KButton, KButtonGroup, KIcon} from 'kku-ui'
import {Line} from 'react-chartjs-2'
import {
  ChartJsDataType,
  MarketChartIntervalTypeList,
} from '@/pages/overviewPage/components/marketChart/MarketChart.interface'
import {MarketChartIntervalType} from '@/shared/stores/store.interface'
import useStore from '@/shared/stores/store'
import {CountText, HorizontalCard, UpdownIcon} from '@/components'
import {useMarketChartData} from '@/shared/api'
import './MarketChart.scss'


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement)

const marketChartIntervalOptions: MarketChartIntervalTypeList[] = [
  {text: '1D', value: 1},
  {text: '1W', value: 7},
  {text: '1M', value: 30},
  {text: '1Y', value: 365},
]

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: '', data, borderColor: isDark ? '#fff' : '#000', backgroundColor: 'transparent',
  borderWidth: 2, pointBackgroundColor: '#f7931a', pointHoverRadius: 4,
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)), // 최댓값 위치에 점 표시
})


const MarketChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<'line', number[], string>>(null)
  const usdPrice = useStore(state => state.bitcoinPrice.usd)
  const marketChartInterval = useStore(state => state.marketChartInterval)
  const setMarketChartInterval = useStore(state => state.setMarketChartInterval)
  const {marketChartData} = useMarketChartData(marketChartInterval)
  const isDark = useStore(store => store.theme) === 'dark'


  const maxValueIndex = useMemo(() => {

    const dataList = marketChartData?.price || []
    const maxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity)

    return dataList.indexOf(maxValue)
  }, [marketChartData, marketChartInterval])


  const currentChartData = useMemo((): ChartJsDataType => ({

    labels: marketChartData?.date.map((timestamp: number) => new Date(timestamp).toLocaleDateString()) || [],
    datasets: [getChartDataset(marketChartData?.price || [], maxValueIndex, isDark)],
  }), [marketChartData, marketChartInterval, maxValueIndex])

  const maxValue = useMemo(() => (
    currentChartData.datasets[0].data[maxValueIndex]
  ), [currentChartData, maxValueIndex])

  const percentage = useMemo(() => {

    const factor = 10 ** 2
    const percentValue = (usdPrice - maxValue) / Math.abs(usdPrice) * 100

    return Math.floor(percentValue * factor) / factor
  }, [usdPrice, maxValue])
  // endregion


  // region [Privates]
  const initializeTooltip = useCallback(() => {

    // 데이터가 있을 때 초기화
    setTimeout(() => {

      if (currentChartData.labels.length > 0 && chartRef.current) {
        chartRef.current?.tooltip?.setActiveElements([{datasetIndex: 0, index: maxValueIndex}], {x: 0, y: 0})
        chartRef.current?.update()
      }
    }, 300)
  }, [maxValueIndex, currentChartData])
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: MarketChartIntervalType) => {

    const clazz = ['market-chart__button']

    if (marketChartInterval === value) {
      clazz.push('market-chart__button--active')
    }

    return clazz.join(' ')
  }, [marketChartInterval])
  // endregion


  // region [Templates]
  const TopLogoArea = useMemo(() => (
    <div className="market-chart__top__fist__logo">
      <KIcon icon="bitcoin" color={isDark ? '#fff' : '#000'} size={33}/>
      <p className="market-chart__top__wrapper__text__area">
        <span className="market-chart__top__wrapper__text__area--top">Bitcoin</span>
        <span className="market-chart__top__wrapper__text__area--bottom">Price</span>
      </p>
    </div>
  ), [])


  const ButtonIntervalArea = useMemo(() => (
    <KButtonGroup className="market-chart__top__first__button-area">
      {
        marketChartIntervalOptions.map(({value, text}) => (
          <KButton key={value} label={text} size="small" className={chartCardButtonClass(value)}
                   onClick={() => setMarketChartInterval(value)}/>
        ))
      }
    </KButtonGroup>
  ), [setMarketChartInterval, chartCardButtonClass])


  const ChartArea = useMemo(() => (
    <>
      <Line ref={chartRef} data={currentChartData} height="120%"
            className="market-chart__chart__wrapper__body"
            options={{
              plugins: {
                legend: {display: false},
                tooltip: {
                  enabled: true,
                  usePointStyle: true,
                  caretPadding: 6,
                  callbacks: {
                    label: (e) => `$${(e.formattedValue)}`,
                  },
                },
              },
              elements: {point: {radius: 0}, line: {tension: 0.3, borderWidth: 2}},
              scales: {x: {display: false}, y: {display: false, suggestedMax: maxValue * 1.005}},
              animation: {
                duration: 800,
                easing: 'easeInOutQuart',
                onComplete: initializeTooltip,
              },
            }}
      />
      <div className="market-chart__chart__wrapper__line__area">
        {Array.from({length: 9}, (_, i) => (
          <span key={i} style={{'left': `${(i + 1) * 10}%`}}
                className="market-chart__chart__wrapper__line__area--line"/>
        ))}
      </div>
    </>
  ), [maxValue, currentChartData, initializeTooltip])
  // endregion


  return (
    <HorizontalCard className="market-chart">

      <div className="market-chart__top">

        <div className="market-chart__top__fist">
          {TopLogoArea}
          {ButtonIntervalArea}
        </div>

        <div className="market-chart__top__second">
          <span className="market-chart__top__second__price">
            <CountText value={usdPrice}/>
          </span>

          <span className="market-chart__top__second__rate">
            <UpdownIcon isUp={percentage > 0}/>
            <CountText value={percentage} decimals={2}/>%
          </span>
        </div>
      </div>

      <div className="market-chart__bottom">{ChartArea}</div>

    </HorizontalCard>
  )
}


export default memo(MarketChart)
