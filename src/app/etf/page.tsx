import { Suspense } from "react";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { EtfScreen } from "@/views/etf";
import EtfLoading from "./loading";

const ETF_PAGE_DESCRIPTION =
  "미국 비트코인 현물 ETF의 일별 순유입과 누적 순유입, 전체 운용자산, ETF별 자금 흐름을 확인하세요.";
const ETF_PAGE_TITLE = "미국 비트코인 현물 ETF 현황";
const ETF_PAGE_SUBTITLE = "ETF로 들어오고 나간 자금을 거래일마다 확인하세요";

export const metadata = createPageMetadata({
  path: "/etf",
  title: "비트코인 현물 ETF 자금 흐름",
  description: ETF_PAGE_DESCRIPTION,
});

/**
 * ISR 주기(초) = 1시간.
 * 리터럴이어야 정적 분석됨. `BITCOIN_ETF_REVALIDATE_SECONDS`( entities/etf ) 와 같은 값 유지.
 */
export const revalidate = 3600;

export default function EtfPage() {
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
      <Suspense fallback={<EtfLoading />}>
        <EtfScreen />
      </Suspense>
    </PageLayout>
  );
}
