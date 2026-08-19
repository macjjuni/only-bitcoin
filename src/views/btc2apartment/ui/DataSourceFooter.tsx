import { memo } from "react";
import { Card, CardContent, CollapseSection } from "@/shared/ui";

interface DataSourceFooterProps {
  archiveGeneratedAt: string;
}

const DataSourceFooter = ({ archiveGeneratedAt }: DataSourceFooterProps) => {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <CollapseSection
          title={<span className="text-base font-bold">데이터 출처 및 산정 기준</span>}
          summaryClassName="py-1"
          contentClassName="mt-3 flex flex-col gap-3 text-xs leading-relaxed"
        >
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">데이터 출처</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc text-sm opacity-80">
              <li>아파트 실거래가: 공공데이터포털 · 국토교통부 아파트 매매 실거래가</li>
              <li>BTC 원화 시세: 빗썸 KRW-BTC 일봉 (2014년~현재)</li>
              <li>
                2014~2015년 중 빗썸 거래 중단 구간(약 3개월)만 blockchain.com USD 일별 시세 × 연평균
                환율로 보완
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">아파트 매매 가격</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc text-sm opacity-80">
              <li>선택한 평형의 해당 연도 실거래 중앙값(평균이 아닌 중앙값으로 이상치 방어)</li>
              <li>계약 해제 건 제외, 직거래 포함</li>
              <li>전용면적은 소수점 이하 버림으로 그룹핑(예: 84.38㎡, 84.99㎡ → 84㎡)</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">BTC 환산 기준</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc text-sm opacity-80">
              <li>각 거래의 계약일 종가로 개별 환산 후 연 중앙값 산출</li>
              <li>연평균이나 연말 종가가 아닌 거래일 매칭 방식(오차 최소화)</li>
              <li>일봉이 한국 시간 자정 마감이라 계약일과 같은 날짜 기준으로 맞춰짐</li>
              <li>상단 헤드라인의 현재 BTC 환산만 실시간 시세 적용</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-base font-bold">데이터 기준일</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc text-sm opacity-80">
              <li>확정 연도 집계 기준 {archiveGeneratedAt}</li>
              <li>실거래 신고는 계약 후 최대 30일까지 가능해 최근 몇 달치는 계속 늘어납니다</li>
            </ul>
          </div>
        </CollapseSection>
      </CardContent>
    </Card>
  );
};

const MemoizedDataSourceFooter = memo(DataSourceFooter);
MemoizedDataSourceFooter.displayName = "DataSourceFooter";

export default MemoizedDataSourceFooter;
