import { getMemeImages } from "@/shared/api/meme";
import MemeClientPage from "@/components/features/meme/MemeClientPage";

export default async function Page() {
  const initialImages = await getMemeImages();
  return <MemeClientPage initialImages={initialImages} />;
}