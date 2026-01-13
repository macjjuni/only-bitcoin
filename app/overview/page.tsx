import { Metadata } from "next";
import { BlockHalvingCard, ClientChart, MacroWidgetPanel, PricePanel } from "@/components/features/overview";

import { PageLayout } from "@/layouts";
import { env } from "@/shared/config/env";


export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Overview`,
  description: "비트코인(BTC) 실시간 시세, 해시레이트, 채굴 난이도 및 간략한 차트, 반감기 정보를 한 화면에서 실시간으로 확인하세요.",
};


export default function OverviewPage() {

  return (
    <PageLayout>
      <PricePanel />
      <MacroWidgetPanel />
      <ClientChart />
      <BlockHalvingCard />
    </PageLayout>
  );
}
