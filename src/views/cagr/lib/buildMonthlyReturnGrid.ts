/**
 * 월별 종가 Map 을 히트맵 격자로 옮김.
 *
 * 행이 연도, 열이 1~12월이고 맨 끝에 연간 열이 하나 더 붙음.
 * 표현에 종속된 집계라 `entities` 가 아니라 이 화면 밑에 둠.
 */

/** 열 머리에 찍을 월 라벨 */
export const MONTH_COLUMN_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const MONTHS_IN_YEAR = 12;
const DECEMBER = 12;

export interface MonthlyReturnRow {
  year: number;
  /** 1~12월 등락률(%). 종가가 없어 계산이 안 되면 null */
  monthlyReturnRates: (number | null)[];
  /**
   * 전년 12월 종가 대비 그 해 마지막 종가의 등락률(%).
   *
   * 열두 칸을 복리로 곱한 것과 같은 값임. 범위가 월별 칸과 달라 색을 칠하지 않음.
   */
  annualReturnRate: number | null;
}

/** 'YYYY-MM' 키 */
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * 변화율(%). 분모가 없거나 0 이하면 계산하지 않음.
 *
 * 분모 0 을 안 막으면 `Infinity` 가 그대로 셀에 찍힘. 소스가 초기 구간을 0 으로
 * 내려주는 일이 실제로 있어( `btcMonthlyUsd` 주석 참고 ) 여기서 한 번 더 막음.
 */
function calculateReturnRate(previousClose: number | null, currentClose: number | null) {
  if (previousClose === null || currentClose === null || previousClose <= 0) {
    return null;
  }

  const returnRate = (currentClose / previousClose - 1) * 100;

  return Number.isFinite(returnRate) ? returnRate : null;
}

export function buildMonthlyReturnGrid(
  monthlyCloseMap: ReadonlyMap<string, number>,
): MonthlyReturnRow[] {
  const years = [
    ...new Set([...monthlyCloseMap.keys()].map((key) => Number(key.slice(0, 4)))),
  ].sort((left, right) => left - right);

  const firstYear = years[0];
  const lastYear = years.at(-1);

  if (firstYear === undefined || lastYear === undefined) {
    return [];
  }

  const resolveClose = (year: number, month: number) =>
    monthlyCloseMap.get(toMonthKey(year, month)) ?? null;

  /** 그 해에 값이 있는 마지막 달의 종가. 진행 중인 해면 이번 달이 됨. */
  const resolveLastCloseOfYear = (year: number) => {
    for (let month = DECEMBER; month >= 1; month -= 1) {
      const close = resolveClose(year, month);

      if (close !== null) {
        return close;
      }
    }

    return null;
  };

  const rows: MonthlyReturnRow[] = [];

  // 중간에 통째로 빈 해가 있어도 행 자체는 만들어 연도 축이 끊기지 않게 함.
  for (let year = firstYear; year <= lastYear; year += 1) {
    const previousDecemberClose = resolveClose(year - 1, DECEMBER);

    const monthlyReturnRates = Array.from({ length: MONTHS_IN_YEAR }, (_, index) => {
      const month = index + 1;
      // 1월의 전월은 전년 12월임. 이걸 빠뜨리면 매년 1월 칸이 통째로 비어 버림.
      const previousClose = month === 1 ? previousDecemberClose : resolveClose(year, month - 1);

      return calculateReturnRate(previousClose, resolveClose(year, month));
    });

    rows.push({
      year,
      monthlyReturnRates,
      annualReturnRate: calculateReturnRate(previousDecemberClose, resolveLastCloseOfYear(year)),
    });
  }

  return rows;
}
