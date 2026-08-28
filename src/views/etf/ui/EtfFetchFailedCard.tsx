import { Card, CardContent } from "@/shared/ui";

export default function EtfFetchFailedCard() {
  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-2 p-4">
        <strong className="text-base font-bold">ETF 데이터를 불러오지 못했어요</strong>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Xoomar API 응답이 없거나 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </CardContent>
    </Card>
  );
}
