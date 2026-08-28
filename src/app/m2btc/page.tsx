import { Suspense } from "react";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { M2BtcScreen } from "@/views/m2btc";
import M2BtcLoading from "./loading";

const PAGE_TITLE = "미국 M2와 비트코인";
const PAGE_DESCRIPTION =
  "2010년부터 현재까지 미국 M2 통화량과 비트코인 월별 달러 가격을 하나의 차트에서 비교하세요.";

export const metadata = createPageMetadata({
  description: PAGE_DESCRIPTION,
  path: "/m2btc",
  title: PAGE_TITLE,
});

/** 가장 짧은 FRED 서버 캐시 주기에 맞춘 4시간 ISR. */
export const revalidate = 14400;

export default function M2BtcPage() {
  return (
    <PageLayout className="gap-3 font-pretendard">
      <JsonLd
        schema={createWebApplicationSchema({
          description: PAGE_DESCRIPTION,
          name: PAGE_TITLE,
          path: "/m2btc",
        })}
      />
      <PageTitle
        description="비트코인 전체 가격 이력과 미국 통화량의 장기 흐름을 월별로 비교합니다."
        label="M2 · BTC"
        title={PAGE_TITLE}
      />
      <Suspense fallback={<M2BtcLoading />}>
        <M2BtcScreen />
      </Suspense>
    </PageLayout>
  );
}
