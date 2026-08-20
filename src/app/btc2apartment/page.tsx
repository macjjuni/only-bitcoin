import type { Metadata } from "next";
import { ARCHIVE_GENERATED_AT } from "@/entities/apartment/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { Btc2ApartmentPanel } from "@/views/btc2apartment";

const PAGE_DESCRIPTION =
  "원화로는 폭등했지만 비트코인으로는 1/10 토막 난 대한민국 랜드마크 아파트 실거래가 추이";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - 아파트 몇 BTC?`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/btc2apartment" },
  openGraph: {
    type: "website",
    url: "/btc2apartment", // metadataBase 기준 상대경로로 씀
    title: "아파트 몇 BTC?",
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: "/app/og-image-apartment.webp",
        width: 1200,
        height: 630,
        alt: "비트코인으로 환산한 랜드마크 아파트 실거래가 추이",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "아파트 몇 BTC?",
    description: PAGE_DESCRIPTION,
    images: ["/app/og-image-apartment.webp"],
  },
};

export default function Btc2ApartmentPage() {
  return (
    <PageLayout className="gap-3">
      <Btc2ApartmentPanel archiveGeneratedAt={ARCHIVE_GENERATED_AT} />
    </PageLayout>
  );
}
