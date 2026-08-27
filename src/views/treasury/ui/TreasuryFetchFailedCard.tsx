import { Card, CardContent } from "@/shared/ui";

/** CoinGecko 조회가 실패해 스냅샷이 비었을 때 표시하는 대체 화면. */
export default function TreasuryFetchFailedCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <strong className="text-base font-bold">데이터를 불러오지 못했어요</strong>
        <p className="text-sm leading-relaxed text-muted-foreground">
          CoinGecko 트레저리 API 응답이 없습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
