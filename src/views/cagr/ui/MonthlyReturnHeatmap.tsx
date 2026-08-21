import { MONTH_COLUMN_LABELS, type MonthlyReturnRow } from "../lib/buildMonthlyReturnGrid";
import { formatReturnRate, resolveHeatClassName } from "../lib/heatLevel";
import HeatmapLegend from "./HeatmapLegend";

/**
 * 연도 × 월 등락률 히트맵.
 *
 * 셀 값과 색이 서버에서 전부 확정되고 상호작용이 없어 **클라이언트 컴포넌트가 아님.**
 * 다크 모드는 `--up-rgb` · `--down-rgb` 토큰이 CSS 로만 처리해 자바스크립트가 필요 없음.
 *
 * ApexCharts 대신 표로 그린 이유는 두 가지임.
 *  - 연간 열만 색을 빼야 하는데 히트맵 차트는 셀 단위 색 지정을 안 받음
 *  - 12열 + 숫자라 좁은 화면에서는 가로 스크롤 + 연도 열 고정이 필요함
 */

/** 셀 하나의 최소 폭. 이보다 좁으면 `-100%` 가 줄바꿈됨. */
const CELL_CLASS_NAME = "min-w-[44px] rounded-[3px] px-1.5 py-1 text-center";

/** 스크롤되는 셀을 가려야 하므로 반드시 불투명색임. 페이지 배경과 살짝 달라 축 구실도 함. */
const YEAR_HEADER_CLASS_NAME =
  "sticky left-0 z-10 rounded-[3px] bg-neutral-100 px-1.5 py-1 text-right font-medium dark:bg-neutral-900";

const ANNUAL_COLUMN_CLASS_NAME = "border-l border-neutral-300 pl-2 dark:border-neutral-600";

interface MonthlyReturnHeatmapProps {
  rows: MonthlyReturnRow[];
}

const MonthlyReturnHeatmap = ({ rows }: MonthlyReturnHeatmapProps) => {
  // region [Privates]
  /** 데스크톱 호버와 스크린리더용. 값이 없는 칸에는 붙이지 않음. */
  const buildCellTitle = (year: number, monthLabel: string, returnRate: number | null) => {
    if (returnRate === null) {
      return undefined;
    }

    return `${year}년 ${monthLabel}월 · ${formatReturnRate(returnRate)}`;
  };
  // endregion

  // region [Templates]
  const HeadRowTemplate = (
    <tr>
      <th scope="col" className={YEAR_HEADER_CLASS_NAME}>
        연도
      </th>
      {MONTH_COLUMN_LABELS.map((monthLabel) => (
        <th key={monthLabel} scope="col" className="px-1.5 py-1 font-medium">
          {monthLabel}
        </th>
      ))}
      <th scope="col" className={`px-1.5 py-1 font-bold ${ANNUAL_COLUMN_CLASS_NAME}`}>
        연간
      </th>
    </tr>
  );

  const BodyRowTemplates = rows.map((row) => (
    <tr key={row.year}>
      <th scope="row" className={YEAR_HEADER_CLASS_NAME}>
        {row.year}
      </th>
      {row.monthlyReturnRates.map((returnRate, monthIndex) => (
        <td
          key={MONTH_COLUMN_LABELS[monthIndex]}
          className={`${CELL_CLASS_NAME} ${resolveHeatClassName(returnRate)}`}
          title={buildCellTitle(row.year, MONTH_COLUMN_LABELS[monthIndex], returnRate)}
        >
          {returnRate === null ? "" : formatReturnRate(returnRate)}
        </td>
      ))}
      {/* 연간 열은 열두 칸을 복리로 곱한 값이라 범위가 달라 색을 칠하지 않음. */}
      <td className={`${CELL_CLASS_NAME} font-bold ${ANNUAL_COLUMN_CLASS_NAME}`}>
        {row.annualReturnRate === null ? "" : formatReturnRate(row.annualReturnRate)}
      </td>
    </tr>
  ));
  // endregion

  return (
    <div className="flex flex-col gap-3">
      {/*
        표만 페이지 좌우 끝까지 빠져나가야 좁은 화면에서 열이 하나라도 더 보임.
        스크롤 컨테이너에 좌우 패딩을 주면 안 됨. `sticky left-0` 은 패딩 안쪽에 붙는데
        스크롤되는 셀은 패딩 영역까지 지나가서, 고정된 연도 열 왼쪽으로 색이 비쳐 보임.
      */}
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] font-number text-[11px] tabular-nums">
          <caption className="sr-only">
            비트코인 월별 등락률. 행은 연도, 열은 월이며 각 칸은 전월 종가 대비 변화율임.
          </caption>
          <thead className="text-muted-foreground">{HeadRowTemplate}</thead>
          <tbody>{BodyRowTemplates}</tbody>
        </table>
      </div>
      <HeatmapLegend />
    </div>
  );
};

export default MonthlyReturnHeatmap;
