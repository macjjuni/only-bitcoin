import { Card, CardContent } from "@/shared/ui";

interface M2FetchFailedCardProps {
  /** BTC 시세만으로 차트를 그릴 수 있는지 여부. */
  hasBitcoinFallback: boolean;
}

/** FRED M2 조회 실패를 차트 위 배너로 안내한다. */
export default function M2FetchFailedCard({ hasBitcoinFallback }: M2FetchFailedCardProps) {
  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-2 p-4">
        <strong className="text-base font-bold">미국 M2 데이터를 불러오지 못했어요</strong>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {hasBitcoinFallback
            ? "지금은 비트코인 가격만 표시합니다. 잠시 후 다시 시도해 주세요."
            : "잠시 후 다시 시도해 주세요."}
        </p>
      </CardContent>
    </Card>
  );
}
