import { ARCHIVE_GENERATED_AT } from "@/entities/apartment/server";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { Btc2ApartmentPanel } from "@/views/btc2apartment";

const PAGE_DESCRIPTION =
  "원화로는 폭등했지만 비트코인으로는 1/10 토막 난 대한민국 랜드마크 아파트 실거래가 추이";

export const metadata = createPageMetadata({
  path: "/btc2apartment",
  title: "아파트 몇 BTC?",
  description: PAGE_DESCRIPTION,
  image: {
    url: "/app/og-image-apartment.webp",
    width: 1200,
    height: 630,
    alt: "비트코인으로 환산한 랜드마크 아파트 실거래가 추이",
  },
});

export default function Btc2ApartmentPage() {
  return (
    <PageLayout className="gap-3">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "아파트 몇 BTC?",
          description: PAGE_DESCRIPTION,
          path: "/btc2apartment",
        })}
      />
      <Btc2ApartmentPanel archiveGeneratedAt={ARCHIVE_GENERATED_AT} />
    </PageLayout>
  );
}
