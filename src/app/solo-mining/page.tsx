import { fetchInitialBlocks } from "@/entities/block/server";
import { createFaqSchema, createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { SOLO_MINING_FAQ, SoloMiningGuideArticle, SoloMiningPanel } from "@/views/solo-mining";

export const metadata = createPageMetadata({
  path: "/solo-mining",
  title: "솔로 마이닝 확률 계산기",
  description:
    "실시간 채굴 난이도를 기준으로 내 해시레이트의 비트코인 블록 채굴 확률과 기대 소요 시간을 계산해 보세요. NerdMiner, Bitaxe 등 소형 채굴기도 지원합니다.",
});

export default async function SoloMiningPage() {
  const { blocks } = await fetchInitialBlocks();
  const initialDifficulty = blocks[0]?.difficulty ?? 0;

  return (
    <PageLayout className="gap-2.5">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "솔로 마이닝 확률 계산기",
          description:
            "실시간 채굴 난이도를 기준으로 내 해시레이트의 비트코인 블록 채굴 확률과 기대 소요 시간을 계산합니다.",
          path: "/solo-mining",
        })}
      />
      <JsonLd schema={createFaqSchema(SOLO_MINING_FAQ)} />
      <SoloMiningPanel initialDifficulty={initialDifficulty} />
      <SoloMiningGuideArticle />
    </PageLayout>
  );
}
