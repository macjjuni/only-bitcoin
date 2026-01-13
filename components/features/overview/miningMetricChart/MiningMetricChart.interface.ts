import {MiningMetricChartIntervalType} from '@/shared/stores/store.interface'

export interface ChartJsDataType {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    pointBackgroundColor?: string;
  }[];
}

export interface MarketChartIntervalTypeList {
  text: string;
  value: MiningMetricChartIntervalType;
}
