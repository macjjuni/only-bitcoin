import type { ApexOptions } from 'apexcharts'


export interface CreateChartOptionsParams {
  isDark: boolean
  formatter: (val: number) => string
  maxPoint: { x: number; y: number } | null
  strokeWidth: number
  fillOpacityTo: { light: number; dark: number }
  fillStops: [number, number]
}


/**
 * 두 차트(Market/MiningMetric)가 공유하는 ApexOptions 객체 생성
 * 시각 차이값(strokeWidth, fillOpacityTo, fillStops)은 호출부에서 주입
 */
export const createChartOptions = ({
  isDark,
  formatter,
  maxPoint,
  strokeWidth,
  fillOpacityTo,
  fillStops,
}: CreateChartOptionsParams): ApexOptions => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    background: 'transparent',
    animations: { enabled: false },
  },
  theme: { mode: isDark ? 'dark' : 'light' },
  colors: [isDark ? '#f7931a' : '#f7931a'],
  stroke: { curve: 'smooth', width: strokeWidth },
  fill: {
    type: 'gradient',
    colors: ['#f7931a'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: isDark ? 0.66 : 0.7,
      opacityTo: isDark ? fillOpacityTo.dark : fillOpacityTo.light,
      stops: fillStops,
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
  annotations: {
    yaxis: [],
    xaxis: [],
    texts: [],
    images: [],
    shapes: [],
    points: maxPoint ? [{
      x: maxPoint.x,
      y: maxPoint.y,
      marker: {
        size: 4,
        fillColor: '#f7931a',
        strokeColor: '#fff',
        strokeWidth: 2,
      },
      label: {
        text: formatter(maxPoint.y),
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
    }] : [],
  } as unknown as ApexOptions['annotations'],
})
