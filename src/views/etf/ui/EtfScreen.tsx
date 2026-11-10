import { fetchInitialExchangeRate } from "@/entities/bitcoin/server";
import { fetchBitcoinEtfSnapshot } from "@/entities/etf/server";
import { UpdatedAtBar } from "@/shared/ui";
import { buildEtfOverview } from "../lib/buildEtfOverview";
import EtfCumulativeChart from "./EtfCumulativeChart";
import EtfFetchFailedCard from "./EtfFetchFailedCard";
import EtfFlowChart from "./EtfFlowChart";
import EtfFundListCard from "./EtfFundListCard";
import EtfGuideArticle from "./EtfGuideArticle";
import EtfSummaryHero from "./EtfSummaryHero";

/**
 * 마지막 거래일이 이보다 오래됐으면 갱신이 멈춘 것으로 봄.
 * 주말에 월요일 휴장이 붙어도 금요일 → 화요일로 4일이라 여유를 둠.
 * 예전 원천이 조용히 멈췄을 때 화면이 최신인 척한 적이 있어서 넣음.
 */
const STALE_AFTER_DAYS = 6;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// region [Privates]
const isLatestSessionStale = (latestDate: string): boolean => {
  const latestTimestamp = Date.parse(`${latestDate}T00:00:00Z`);

  return (
    Number.isFinite(latestTimestamp) &&
    Date.now() - latestTimestamp > STALE_AFTER_DAYS * MILLISECONDS_PER_DAY
  );
};
// endregion

/** ETF와 환율 데이터를 조회해 페이지의 비동기 콘텐츠를 구성한다. */
export default async function EtfScreen() {
  // region [Transactions]
  const [snapshot, exchangeRate] = await Promise.all([
    fetchBitcoinEtfSnapshot(),
    fetchInitialExchangeRate(),
  ]);
  // endregion

  const overview = snapshot.hasFetchFailed ? null : buildEtfOverview(snapshot.dailyFlows);

  if (!overview) {
    return (
      <>
        <EtfFetchFailedCard />
        <EtfGuideArticle />
      </>
    );
  }

  return (
    <>
      <EtfSummaryHero overview={overview} usdExRate={exchangeRate.usdExRate} />
      <UpdatedAtBar
        updatedAt={snapshot.sourceUpdatedAt}
        isDelayed={isLatestSessionStale(overview.latestDate)}
      />
      <EtfFlowChart chartPoints={overview.chartPoints} />
      <EtfCumulativeChart chartPoints={overview.chartPoints} />
      <EtfFundListCard funds={overview.fundFlows} />
      <EtfGuideArticle />
    </>
  );
}
