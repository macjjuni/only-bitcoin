import { fetchBitcoinEtfSnapshot } from "@/entities/etf/server";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  EtfFetchFailedCard,
  EtfFlowChart,
  EtfFundListCard,
  EtfGuideArticle,
  EtfSummaryHero,
} from "@/views/etf";

const ETF_PAGE_DESCRIPTION =
  "미국 비트코인 현물 ETF의 일별 추정 순유입, BTC 보유량, 운용자산과 ETF별 현황을 확인하세요.";

export const metadata = createPageMetadata({
  path: "/etf",
  title: "비트코인 현물 ETF 자금 흐름",
  description: ETF_PAGE_DESCRIPTION,
});

/** Xoomar 서버 캐시 주기와 같은 1시간 ISR. */
export const revalidate = 3600;

export default async function EtfPage() {
  const snapshot = await fetchBitcoinEtfSnapshot();

  if (snapshot.hasFetchFailed) {
    return (
      <PageLayout className="gap-2.5">
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
      <EtfSummaryHero summary={snapshot.summary} dailyFlows={snapshot.dailyFlows} />
      <EtfFlowChart dailyFlows={snapshot.dailyFlows} />
      <EtfFundListCard funds={snapshot.funds} />
      <EtfGuideArticle />
    </PageLayout>
  );
}
