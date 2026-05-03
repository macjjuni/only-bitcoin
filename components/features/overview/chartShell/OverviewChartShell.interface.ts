import type { ReactNode } from 'react'


export interface ChartIntervalOption<T extends string | number> {
  text: string
  value: T
}

export interface ChartSeriesPoint {
  x: number
  y: number
}

export interface OverviewChartShellProps<T extends string | number> {
  seriesName: string
  seriesData: ChartSeriesPoint[]
  isLoading: boolean
  formatter: (val: number) => string
  intervalOptions: ChartIntervalOption<T>[]
  currentInterval: T
  onChangeInterval: (value: T) => void
  strokeWidth: number
  fillOpacityTo: { light: number; dark: number }
  fillStops: [number, number]
  chartHeight: number
  topSlot?: ReactNode
  loadingClassName?: string
}
