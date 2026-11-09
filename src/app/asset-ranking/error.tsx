"use client";

import { Card, CardContent } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";

interface AssetRankingErrorProps {
  retry: () => void;
}

export default function AssetRankingError({ retry }: AssetRankingErrorProps) {
  // region [Events]
  const onClickRetryButton = () => {
    retry();
  };
  // endregion

  return (
    <PageLayout className="font-pretendard">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h1 className="text-base font-bold">자산 랭킹을 불러오지 못했어요</h1>
          <p className="text-sm text-muted-foreground">
            원본 사이트의 응답이 지연되거나 데이터 수집에 실패했습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={onClickRetryButton}
            className="rounded-lg bg-bitcoin px-4 py-2.5 text-sm font-bold text-white"
          >
            다시 시도
          </button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
