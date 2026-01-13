import { PageLayout } from "@/layouts";
import { Metadata } from "next";
import { env } from "@/shared/config/env";
import OrangeFillContent from "@/components/features/orange-pill/orangeFillContent/OrangeFillContent";


export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Orange Pill`,
  description: "비트코인 오렌지필: 새로운 금융의 패러다임을 경험하세요. 비트코인의 희소성, 탈중앙화 철학, 그리고 왜 비트코인이 미래의 화폐인지에 대한 깊이 있는 통찰과 입문 가이드를 제공합니다."
};


export default function PremiumPage() {

  return (
    <PageLayout className="pt-0.5">
      <OrangeFillContent />
    </PageLayout>
  );
}