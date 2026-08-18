import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { Btc2ApartmentPanel } from "@/views/btc2apartment";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - BTC to Apartment`,
  description:
    "국토교통부 실거래가로 본 서울 랜드마크 아파트의 비트코인 환산 가격. 원화로는 올랐지만 비트코인으로는 얼마나 싸졌는지 확인해 보세요.",
};

export default function Btc2ApartmentPage() {
  return (
    <PageLayout className="gap-3">
      <Btc2ApartmentPanel />
    </PageLayout>
  );
}
