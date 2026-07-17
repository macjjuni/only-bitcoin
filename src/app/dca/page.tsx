import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { DcaPanel } from "@/views/dca";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - DCA`,
  description: "비트코인 매수 기록을 관리하고 평단가와 목표 달성 현황을 확인해 보세요.",
};

export default function DcaPage() {
  return (
    <PageLayout className="!pt-4 gap-3">
      <DcaPanel />
    </PageLayout>
  );
}
