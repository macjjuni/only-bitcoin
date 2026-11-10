import { Suspense } from "react";
import { COIN_MARKET_SOURCE_URL } from "@/entities/coin-market";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { CoinMapScreen, CoinMapSkeleton } from "@/views/heatmap";

export const metadata = createPageMetadata({
  path: "/heatmap",
  title: "시가총액 히트맵",
  description:
    "상위 20개 암호화폐의 시가총액을 트리맵으로 비교하고, 전체 코인 시장에서 비트코인이 차지하는 비중을 확인하세요.",
});

/**
 * ISR 주기(초) = 10분.
 * 리터럴이어야 정적 분석됨. `COIN_MARKET_REVALIDATE_SECONDS` 와 같은 값 유지.
 */
export const revalidate = 600;

export default function CoinMapPage() {
  return (
    <PageLayout className="gap-2.5 font-pretendard">
      <PageTitle
        label="Market Cap Heatmap"
        title="시가총액 히트맵"
        description="코인 시장에서 비트코인이 차지하는 크기, 한눈에"
      />
      <Suspense fallback={<CoinMapSkeleton />}>
        <CoinMapScreen />
      </Suspense>
      <footer className="space-y-2 px-2 py-4 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          출처:{" "}
          <a
            href={COIN_MARKET_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            CoinGecko
          </a>{" "}
          · 10분마다 갱신합니다.
        </p>
        <p>
          비중의 분모는 CoinGecko 가 집계한 전체 암호화폐 시가총액입니다. 기타는 상위 20개를 뺀
          나머지 전체입니다.
        </p>
      </footer>
    </PageLayout>
  );
}
