import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { ConvertPanel, PriceTicker } from "@/views/btc2fiat";

export const metadata = createPageMetadata({
  path: "/btc2fiat",
  title: "BTC to KRW",
  description: "실시간 시세를 반영한 비트코인 계산기를 이용해 보세요.",
});

export default function Btc2FiatPage() {
  return (
    <PageLayout className="gap-3">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "비트코인 계산기",
          description: "실시간 시세를 반영해 BTC, KRW, USD, 사토시를 서로 환산합니다.",
          path: "/btc2fiat",
        })}
      />
      {/* 시세 티커와 입력폼이 곧 화면이라 제목 UI 를 두지 않음. 제목 신호만 심음. */}
      <PageTitle srOnly label="Calculator" title="비트코인 계산기" />
      <PriceTicker />
      <ConvertPanel />
    </PageLayout>
  );
}
