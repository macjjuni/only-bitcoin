import { fetchInitialMacro } from "@/entities/bitcoin/server";
import { fetchBitcoinEtfSnapshot } from "@/entities/etf/server";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  EtfFetchFailedCard,
  EtfFlowChart,
  EtfFundListCard,
  EtfGuideArticle,
  EtfSummaryHero,
} from "@/views/etf";

const ETF_PAGE_DESCRIPTION =
  "미국 비트코인 현물 ETF의 일별 추정 순유입, BTC 보유량, 운용자산과 BTC 현물 ETF별 현황을 확인하세요.";
const ETF_PAGE_TITLE = "미국 비트코인 현물 ETF 현황";
const ETF_PAGE_SUBTITLE = "발행사 보유량을 기반으로 계산한 일별 추정 자금 흐름";

export const metadata = createPageMetadata({
  path: "/etf",
  title: "비트코인 현물 ETF 자금 흐름",
  description: ETF_PAGE_DESCRIPTION,
});

/** Xoomar 서버 캐시 주기와 같은 1시간 ISR. */
export const revalidate = 3600;

export default async function EtfPage() {
  const [snapshot, initialMacro] = await Promise.all([
    fetchBitcoinEtfSnapshot(),
    fetchInitialMacro(),
  ]);

  if (snapshot.hasFetchFailed) {
    return (
      <PageLayout className="gap-2.5">
        <PageTitle
          label="Bitcoin ETF Tracker"
          title={ETF_PAGE_TITLE}
          description={ETF_PAGE_SUBTITLE}
        />
        <EtfFetchFailedCard />
        <EtfGuideArticle />
      </PageLayout>
    );
  }

  return (
    <PageLayout className="gap-2.5">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "비트코인 현물 ETF 자금 흐름",
          description: ETF_PAGE_DESCRIPTION,
          path: "/etf",
        })}
      />
      <PageTitle
        label="Bitcoin ETF Tracker"
        title={ETF_PAGE_TITLE}
        description={ETF_PAGE_SUBTITLE}
      />
      <EtfSummaryHero
        summary={snapshot.summary}
        dailyFlows={snapshot.dailyFlows}
        sourceUpdatedAt={snapshot.sourceUpdatedAt}
        usdExRate={initialMacro.usdExRate}
      />
      <EtfFlowChart dailyFlows={snapshot.dailyFlows} />
      <EtfFundListCard funds={snapshot.funds} />
      <EtfGuideArticle />
    </PageLayout>
  );
}
