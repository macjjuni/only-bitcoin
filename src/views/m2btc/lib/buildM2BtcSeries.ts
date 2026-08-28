import type { UsM2MonthlyObservation } from "@/entities/money-supply";

export interface M2BtcChartPoint {
  monthKey: string;
  bitcoinPriceInUsd: number;
  usM2InBillionsUsd: number | null;
}

/** BTC 월 목록을 기준으로 같은 달의 미국 M2를 결합한다. */
export function buildM2BtcSeries(
  bitcoinMonthlyUsdMap: ReadonlyMap<string, number>,
  usM2MonthlyObservations: UsM2MonthlyObservation[],
): M2BtcChartPoint[] {
  const usM2ByMonth = new Map(
    usM2MonthlyObservations.map(({ monthKey, valueInBillionsUsd }) => {
      return [monthKey, valueInBillionsUsd];
    }),
  );

  return [...bitcoinMonthlyUsdMap.entries()]
    .sort(([firstMonthKey], [secondMonthKey]) => firstMonthKey.localeCompare(secondMonthKey))
    .map(([monthKey, bitcoinPriceInUsd]) => {
      return {
        monthKey,
        bitcoinPriceInUsd,
        usM2InBillionsUsd: usM2ByMonth.get(monthKey) ?? null,
      };
    });
}
