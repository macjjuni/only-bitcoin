import { fetchInitialMacro, fetchInitialPrice } from "@/entities/bitcoin/server";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { PremiumPanel } from "@/views/premium";

const description = "국내외 거래소의 실시간 비트코인 가격과 한국 프리미엄을 확인하세요." as const;

export const metadata = createPageMetadata({
  path: "/premium",
  title: "Premium",
  description,
});

export default async function PremiumPage() {
  const [initialPrice, initialMacro] = await Promise.all([
    fetchInitialPrice(),
    fetchInitialMacro(),
  ]);

  return (
    <PageLayout className="!gap-0 !px-0">
      <PageTitle label="Kimchi Premium" title="비트코인 한국 프리미엄" description={description} />
      <PremiumPanel initialPrice={initialPrice} initialMacro={initialMacro} />
    </PageLayout>
  );
}
