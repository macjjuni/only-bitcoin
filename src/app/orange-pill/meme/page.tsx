import type { Metadata } from "next";
import { getMemeImages } from "@/entities/meme";
import { env } from "@/shared/config/env";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { MemeClientPage } from "@/views/meme";

const PAGE_TITLE = "비트맥시 밈 저장소";
const PAGE_DESCRIPTION = "X에서 봤던 그 밈! 다 모아놓은 저장소";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Meme`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/orange-pill/meme" },
  openGraph: {
    type: "website",
    url: "/orange-pill/meme", // metadataBase 기준 상대경로로 씀
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: "/app/og-image-meme.webp",
        width: 1200,
        height: 630,
        alt: "비트코인 밈 모음 썸네일",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/app/og-image-meme.webp"],
  },
};

export default async function Page() {
  const initialImages = await getMemeImages();

  return (
    <PageLayout className="gap-4">
      <PageTitle label="BITMAXIES MEME" title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <MemeClientPage initialImages={initialImages} />
    </PageLayout>
  );
}
