import { fetchInitialMacro } from "@/entities/bitcoin/server";
import { fetchBitcoinEtfSnapshot } from "@/entities/etf/server";
import EtfFetchFailedCard from "./EtfFetchFailedCard";
import EtfFlowChart from "./EtfFlowChart";
import EtfFundListCard from "./EtfFundListCard";
import EtfGuideArticle from "./EtfGuideArticle";
import EtfSummaryHero from "./EtfSummaryHero";

/** ETF와 환율 데이터를 조회해 페이지의 비동기 콘텐츠를 구성한다. */
export default async function EtfScreen() {
  const [snapshot, initialMacro] = await Promise.all([
    fetchBitcoinEtfSnapshot(),
    fetchInitialMacro(),
  ]);

  if (snapshot.hasFetchFailed) {
    return (
      <>
        <EtfFetchFailedCard />
        <EtfGuideArticle />
      </>
    );
  }

  return (
    <>
      <EtfSummaryHero
        summary={snapshot.summary}
        dailyFlows={snapshot.dailyFlows}
        sourceUpdatedAt={snapshot.sourceUpdatedAt}
        usdExRate={initialMacro.usdExRate}
      />
      <EtfFlowChart dailyFlows={snapshot.dailyFlows} />
      <EtfFundListCard funds={snapshot.funds} />
      <EtfGuideArticle />
    </>
  );
}
