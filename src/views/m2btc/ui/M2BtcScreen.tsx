import { getBtcMonthlyUsdMap } from "@/entities/bitcoin/server";
import { getUsM2MonthlyObservations } from "@/entities/money-supply/server";
import { buildM2BtcSeries } from "../lib/buildM2BtcSeries";
import { M2BtcChart } from "./M2BtcChart";
import { M2FetchFailedCard } from "./M2FetchFailedCard";
import { M2GuideArticle } from "./M2GuideArticle";

/**
 * M2BTC 페이지의 서버 데이터 조회와 화면 구성을 담당한다.
 *
 * M2 조회가 실패해도 화면을 통째로 실패 카드로 바꾸지 않음. BTC 시세는 멀쩡한데
 * M2 하나 때문에 차트를 못 보는 게 손해라 실패는 배너로만 알리고 차트는 그대로 그림.
 * 가이드와 출처는 조회 결과와 무관한 정적 해설이라 어느 경우에나 남김.
 */
export async function M2BtcScreen() {
  // region [Transactions]
  const [bitcoinMonthlyUsdMap, usM2MonthlyObservations] = await Promise.all([
    getBtcMonthlyUsdMap(),
    getUsM2MonthlyObservations(),
  ]);
  // endregion

  // region [Privates]
  const chartPoints = buildM2BtcSeries(bitcoinMonthlyUsdMap, usM2MonthlyObservations);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const hasUsM2Data = usM2MonthlyObservations.length > 0;
  // endregion

  return (
    <div className="flex flex-col gap-2.5 font-pretendard">
      {!hasUsM2Data && <M2FetchFailedCard hasBitcoinFallback={chartPoints.length > 0} />}

      <M2BtcChart chartPoints={chartPoints} currentMonthKey={currentMonthKey} />

      <M2GuideArticle />

      <p className="px-2 text-xs leading-relaxed text-muted-foreground">
        데이터 출처: blockchain.com · St. Louis Fed FRED
      </p>
    </div>
  );
}
