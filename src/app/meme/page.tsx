import { getMemeImages } from "@/entities/meme";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { MemeClientPage } from "@/views/meme";

const PAGE_TITLE = "비트맥시 밈 저장소";
const PAGE_DESCRIPTION = "X에서 봤던 그 밈! 다 모아놓은 저장소";

export const metadata = createPageMetadata({
  path: "/meme",
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  image: {
    url: "/app/og-image-meme.webp",
    width: 1200,
    height: 630,
    alt: "비트코인 밈 모음 썸네일",
  },
});

export default async function Page() {
  const initialImages = await getMemeImages();

  return (
    <PageLayout className="gap-4">
      <PageTitle label="BITMAXIES MEME" title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
      <MemeClientPage initialImages={initialImages} />
    </PageLayout>
  );
}
