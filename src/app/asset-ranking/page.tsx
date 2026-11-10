import { Suspense } from "react";
import { ASSET_RANKING_SOURCE_URL } from "@/entities/asset-ranking";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { AssetRankingScreen } from "@/views/asset-ranking";
import AssetRankingLoading from "./loading";

export const metadata = createPageMetadata({
  path: "/asset-ranking",
  title: "전 세계 자산 랭킹",
  description:
    "기업·귀금속·암호화폐·ETF의 시가총액 상위 100개와 비트코인의 자산 순위를 확인하세요.",
});

export const runtime = "nodejs";
// 원본 수집 20초 × 2회와 재시도 대기·렌더링 시간을 포함한다.
export const maxDuration = 60;

export default function AssetRankingPage() {
  return (
    <PageLayout className="gap-2.5 font-pretendard">
      <PageTitle
        label="Global Asset Ranking"
        title="전 세계 자산 랭킹"
        description="기업·귀금속·암호화폐·ETF 시가총액 상위 100개"
      />
      <Suspense fallback={<AssetRankingLoading />}>
        <AssetRankingScreen />
      </Suspense>
      <footer className="space-y-2 px-2 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          출처:{" "}
          <a
            href={ASSET_RANKING_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            CompaniesMarketCap
          </a>{" "}
          · 정상 수집 결과를 1시간 캐시합니다.
        </p>
        <p>
          가격과 시가총액은 실시간이 아니며 원본 기준 10분 이상 지연될 수 있습니다. 귀금속
          시가총액은 추정치이며, 기업·귀금속·암호화폐·ETF는 산정 기준이 다릅니다.
        </p>
        <p>모든 금액은 미국 달러(USD) 기준입니다. T = 조, B = 십억, M = 백만 달러입니다.</p>
      </footer>
    </PageLayout>
  );
}
