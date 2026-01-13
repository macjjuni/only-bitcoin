import { getMemeImages } from "@/shared/api/meme";
import MemeClientPage from "@/components/features/meme/MemeClientPage";
import { Metadata } from "next";
import { env } from "@/shared/config/env";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Meme`,
  description: "비트코인 밈과 짤방을 확인하고 공유하세요."
};

export default async function Page() {
  const initialImages = await getMemeImages();
  return <MemeClientPage initialImages={initialImages} />;
}