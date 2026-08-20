import type { Metadata } from "next";
import { fetchPublicTreasurySnapshot } from "@/entities/treasury/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import {
  TreasuryCompanyListCard,
  TreasuryFetchFailedCard,
  TreasuryGuideArticle,
  TreasurySummaryCard,
} from "@/views/treasury";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - 기업 비트코인 트레저리`,
  description:
    "비트코인을 보유한 전 세계 상장기업 현황을 한눈에 확인하세요. 기업별 보유량, 매입 평단가, 평가손익과 전체 발행량 대비 비중을 확인할 수 있습니다.",
  alternates: { canonical: "/treasury" },
};

/**
 * ISR 주기(초) = 10분.
 *
 * Next.js 는 이 값을 빌드 타임에 정적 분석하므로 상수 import 가 아닌 리터럴이어야 한다.
 * `PUBLIC_TREASURY_REVALIDATE_SECONDS`(entities/treasury) 와 같은 값으로 유지한다.
 */
export const revalidate = 600;

export default async function TreasuryPage() {
  const { summary, companies, fetchedAt, hasFetchFailed } = await fetchPublicTreasurySnapshot();

  if (hasFetchFailed) {
    return (
      <PageLayout className="gap-2.5">
        <TreasuryFetchFailedCard />
        <TreasuryGuideArticle />
      </PageLayout>
    );
  }

  return (
    <PageLayout className="gap-2.5">
      <TreasurySummaryCard summary={summary} fetchedAt={fetchedAt} />
      <TreasuryCompanyListCard companies={companies} />
      <TreasuryGuideArticle />
    </PageLayout>
  );
}
