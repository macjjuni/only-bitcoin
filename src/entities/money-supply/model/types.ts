/** FRED `M2SL` 시리즈의 월별 미국 M2 관측값. */
export interface UsM2MonthlyObservation {
  /** 관측 월. `YYYY-MM` 형식. */
  monthKey: string;
  /** 계절조정 미국 M2. 단위는 10억 달러. */
  valueInBillionsUsd: number;
}
