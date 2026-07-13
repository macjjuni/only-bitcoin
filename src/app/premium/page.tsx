import type { Metadata } from "next";
import { fetchInitialMacro, fetchInitialPrice } from "@/entities/bitcoin/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { PremiumLottie, PremiumPanel } from "@/views/premium";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Premium`,
  description: "실시간 비트코인 김치 프리미엄 현황을 실시간으로 확인하세요.",
};

export default async function PremiumPage() {
  const [initialPrice, initialMacro] = await Promise.all([
    fetchInitialPrice(),
    fetchInitialMacro(),
  ]);

  return (
    <PageLayout className="relative overflow-x-hidden isolation-auto gap-2.5 !pt-4">
      <PremiumLottie />
      <PremiumPanel initialPrice={initialPrice} initialMacro={initialMacro} />
    </PageLayout>
  );
}
