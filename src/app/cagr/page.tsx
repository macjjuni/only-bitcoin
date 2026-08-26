import { Suspense } from "react";
import { createWebApplicationSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import { CagrScreen } from "@/views/cagr";
import CagrLoading from "./loading";

const PAGE_TITLE = "월별 등락률";
const PAGE_DESCRIPTION =
  "2010년부터 지금까지 비트코인이 매달 얼마나 오르고 내렸는지 연도 × 월 히트맵 한 장으로";

export const metadata = createPageMetadata({
  path: "/cagr",
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
});

/**
 * 6시간마다 재생성함. 확정된 달은 다시 안 바뀌고 진행 중인 달만 움직이므로
 * 이보다 잦게 구울 이유가 없음.
 *
 * **`entities/bitcoin/api/btcMonthlyUsd.server` 의 진행 중 연도 TTL 과 같은 값이어야 함.**
 * Next 는 라우트 revalidate 를 이 값과 안에서 쓰인 캐시 TTL 의 최솟값으로 잡아서,
 * 한쪽만 바꾸면 작은 쪽이 조용히 이김. 바꿀 때는 항상 두 곳을 같이 바꿈.
 *
 * Next 가 정적 분석으로 읽는 값이라 `60 * 60 * 6` 같은 식이 아니라 리터럴로 씀.
 */
export const revalidate = 21600;

export default function CagrPage() {
  return (
    <PageLayout className="gap-3">
      <JsonLd
        schema={createWebApplicationSchema({
          name: "비트코인 월별 등락률",
          description: PAGE_DESCRIPTION,
          path: "/cagr",
        })}
      />
      <PageTitle
        label="Monthly Returns"
        title="비트코인 월별 등락률"
        description="월별 등락률과 연간 복리 수익률을 확인하세요."
      />
      <Suspense fallback={<CagrLoading />}>
        <CagrScreen />
      </Suspense>
    </PageLayout>
  );
}
