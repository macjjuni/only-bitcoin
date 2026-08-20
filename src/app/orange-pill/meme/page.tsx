import type { Metadata } from "next";
import { getMemeImages } from "@/entities/meme";
import { env } from "@/shared/config/env";
import { MemeClientPage } from "@/views/meme";

const PAGE_TITLE = "비트맥시 전용 밈 저장소";
const PAGE_DESCRIPTION = "비트맥시를 위한 성지";

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
  return <MemeClientPage initialImages={initialImages} />;
}
