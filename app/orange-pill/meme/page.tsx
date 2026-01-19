import { getMemeImages } from "@/shared/api/meme";
import MemeClientPage from "@/components/features/meme/MemeClientPage";
import { Metadata } from "next";
import { env } from "@/shared/config/env";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Meme`,
  description: "비트맥시를 위한 성지",
  openGraph: {
    type: "website",
    url: env.NEXT_PUBLIC_URL,
    title: "비트맥시 전용 밈 저장소",
    description: "비트맥시를 위한 성지",
    images: [
      {
        url: "/app/og-image-meme.webp"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "비트맥시 전용 밈 저장소",
    description: "비트맥시를 위한 성지",
    images: ["/app/og-image-meme.webp"]
  },
};

export default async function Page() {
  const initialImages = await getMemeImages();
  return <MemeClientPage initialImages={initialImages} />;
}