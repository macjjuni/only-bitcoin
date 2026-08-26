import { fetchInitialBlocks } from "@/entities/block/server";
import { env } from "@/shared/config/env";
import { createBreadcrumbSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { HalvingCountdown } from "@/views/blocks";
import CosmicBackdrop from "@/views/blocks/ui/halving-countdown/CosmicBackdrop";

const SERVICE_DOMAIN = env.NEXT_PUBLIC_URL.replace(/^https?:\/\/(www\.)?/, "");

export const metadata = createPageMetadata({
  path: "/blocks/countdown",
  title: "Halving Countdown",
  description:
    "비트코인 다음 반감기까지 남은 시간을 실시간으로 확인하세요. 현재 블록 높이와 남은 블록 수, 예상 반감기 날짜를 함께 제공합니다.",
});

export default async function Page() {
  const { blocks } = await fetchInitialBlocks();
  const currentBlockHeight = blocks[0]?.height ?? 0;

  return (
    // 배경이 테마와 무관하게 딥 스페이스 톤이므로 본문 색도 밝은 쪽으로 고정.
    <PageLayout className="text-white/70 p-4" hasBottomNav={false}>
      <JsonLd
        schema={createBreadcrumbSchema([
          { name: "Blocks", path: "/blocks" },
          { name: "Halving Countdown", path: "/blocks/countdown" },
        ])}
      />
      <PageTitle srOnly label="Halving Countdown" title="비트코인 반감기 카운트다운" />
      <CosmicBackdrop />
      <p className="relative z-10 w-full text-center text-lg font-bold text-white/70 select-none">
        {SERVICE_DOMAIN}
      </p>
      <HalvingCountdown initialBlockHeight={currentBlockHeight} />
    </PageLayout>
  );
}
