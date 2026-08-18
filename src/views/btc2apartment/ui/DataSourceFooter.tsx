import { memo } from "react";
import { Card, CardContent, CollapseSection } from "@/shared/ui";

const DataSourceFooter = () => {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <CollapseSection
          title={<span className="text-xs text-muted-foreground">데이터 출처 및 산정 기준</span>}
          summaryClassName="py-1"
          contentClassName="mt-3 flex flex-col gap-3 text-xs text-muted-foreground leading-relaxed"
        >
          <div className="flex flex-col gap-1">
            <span className="font-bold">데이터 출처</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc">
              <li>아파트 실거래가: 국토교통부 실거래가 공개시스템</li>
              <li>BTC 원화 시세 (2018~): Upbit KRW-BTC 일봉</li>
              <li>BTC 원화 시세 (2014~2017): blockchain.com USD 일별 x 연평균 환율</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-bold">아파트 매매 가격</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc">
              <li>해당 연도 실거래 전체의 중앙값 (평균이 아닌 중앙값으로 이상치 방어)</li>
              <li>계약 해제 건 제외, 직거래 포함</li>
              <li>전용면적은 소수점 이하 버림으로 그룹핑 (예: 84.38㎡, 84.99㎡ → 84㎡)</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-bold">BTC 환산 기준</span>
            <ul className="flex flex-col gap-0.5 pl-3 list-disc">
              <li>각 거래의 계약일 BTC 시세로 개별 환산 후 연 중앙값 산출</li>
              <li>연평균이나 연말 종가가 아닌 거래일 매칭 방식 (오차 최소화)</li>
              <li>상단 헤드라인의 현재 BTC 환산만 실시간 시세 적용</li>
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
