import type { UsM2MonthlyObservation } from "../model/types";

export interface FredM2Observation {
  date: string;
  value: string;
}

const FRED_MONTHLY_DATE_PATTERN = /^\d{4}-\d{2}-01$/;

/** FRED 관측값을 차트에서 사용할 수 있는 월별 미국 M2로 정규화한다. */
export function normalizeFredM2Observations(
  observations: FredM2Observation[],
): UsM2MonthlyObservation[] {
  return observations.flatMap((observation) => {
    if (!FRED_MONTHLY_DATE_PATTERN.test(observation.date) || observation.value === ".") {
      return [];
    }

    const valueInBillionsUsd = Number(observation.value);

    if (!Number.isFinite(valueInBillionsUsd) || valueInBillionsUsd <= 0) {
      return [];
    }

    return [
      {
        monthKey: observation.date.slice(0, 7),
        valueInBillionsUsd,
      },
    ];
  });
}
