import { Card, CardContent } from "@/shared/ui";

/** FRED M2 조회 실패를 페이지 안에서 명확하게 안내한다. */
export function M2FetchFailedCard() {
  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-2 p-4">
        <strong className="text-base font-bold">미국 M2 데이터를 불러오지 못했어요</strong>
        <p className="text-sm leading-relaxed text-muted-foreground">
          FRED API 키가 없거나 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
