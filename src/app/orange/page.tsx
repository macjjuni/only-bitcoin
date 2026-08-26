import { createPageMetadata } from "@/shared/config/metadata";
import { PageLayout } from "@/shared/ui/layout";
import { OrangeContent } from "@/views/orange";

const description =
  "비트코인을 더 깊게 파고들 수 있도록 재밌는 서비스들을 모아봤습니다. 밈 저장소, 아파트 몇 BTC?, 트레저리, DCA 계산기, 월별 등락률, 반감기 카운트, BIP39 를 한곳에서 확인하세요." as const;

export const metadata = createPageMetadata({
  path: "/orange",
  title: "오렌지 서비스",
  description,
});

export default function OrangePage() {
  return (
    <PageLayout className="pt-0.5">
      <OrangeContent />
    </PageLayout>
  );
}
