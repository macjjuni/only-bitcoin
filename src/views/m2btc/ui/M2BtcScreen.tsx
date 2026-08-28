import { getBtcMonthlyUsdMap } from "@/entities/bitcoin/server";
import { getUsM2MonthlyObservations } from "@/entities/money-supply/server";
import { buildM2BtcSeries } from "../lib/buildM2BtcSeries";
import { M2BtcChart } from "./M2BtcChart";
import { M2FetchFailedCard } from "./M2FetchFailedCard";

/** M2BTC 페이지의 서버 데이터 조회와 화면 구성을 담당한다. */
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
  // endregion

  if (usM2MonthlyObservations.length === 0) {
    return <M2FetchFailedCard />;
  }

  return (
    <div className="flex flex-col gap-2.5 font-pretendard">
      <M2BtcChart chartPoints={chartPoints} currentMonthKey={currentMonthKey} />

      <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
        출처: Blockchain.com Market Price · Federal Reserve Bank of St. Louis FRED M2SL
      </p>
    </div>
  );
}
