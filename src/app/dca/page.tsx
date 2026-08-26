import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { DcaPanel } from "@/views/dca";

export const metadata = createPageMetadata({
  path: "/dca",
  title: "DCA 계산기",
  description: "비트코인 매수 기록을 관리하고 평단가와 목표 달성 현황을 확인해 보세요.",
});

export default function DcaPage() {
  return (
    <PageLayout className="gap-3">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "비트코인 DCA 계산기",
          description: "비트코인 매수 기록을 관리하고 평단가와 목표 달성 현황을 계산합니다.",
          path: "/dca",
        })}
      />
      <PageTitle
        label="DCA Calculator"
        title="비트코인 DCA 계산기"
        description="비트코인 매수 기록을 관리하고 평단가와 목표 달성 현황을 확인해 보세요."
      />
      <DcaPanel />
    </PageLayout>
  );
}
