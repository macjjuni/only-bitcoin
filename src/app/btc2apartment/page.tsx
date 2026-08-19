import type { Metadata } from "next";
import { ARCHIVE_GENERATED_AT } from "@/entities/apartment/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { Btc2ApartmentPanel } from "@/views/btc2apartment";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - 아파트 몇 BTC?`,
  description:
    "원화로는 폭등했지만 비트코인으로는 1/10 토막 난 대한민국 랜드마크 아파트 실거래가 추이",
};

export default function Btc2ApartmentPage() {
  return (
    <PageLayout className="gap-3">
      <Btc2ApartmentPanel archiveGeneratedAt={ARCHIVE_GENERATED_AT} />
    </PageLayout>
  );
}
