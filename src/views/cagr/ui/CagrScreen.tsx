import { getBtcMonthlyUsdMap } from "@/entities/bitcoin/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";
import { buildMonthlyReturnGrid } from "../lib/buildMonthlyReturnGrid";
import MonthlyReturnHeatmap from "./MonthlyReturnHeatmap";

/**
 * 월별 등락률 화면 구성.
 *
 * **조회 실패를 잡지 않음.** 던지면 Next 가 재생성 실패로 보고 직전에 성공한
 * 정적 HTML 을 계속 서빙함. 여기서 try/catch 로 "불러오지 못했어요" 화면을
 * 돌려주면 그 화면이 정상 결과로 캐시에 굳어 6시간 동안 남음.
 * 사용자에게 보여 줄 오류 화면은 `app/cagr/error.tsx` 가 맡음.
 */
const CagrScreen = async () => {
  // region [Transactions]
  const monthlyCloseMap = await getBtcMonthlyUsdMap();
  // endregion

  const monthlyReturnRows = buildMonthlyReturnGrid(monthlyCloseMap);

  return (
    <Card className="w-full">
      <h1 className="sr-only">비트코인 월별 등락률</h1>

      <CardHeader>
        <CardTitle className="text-[18px] font-bold">월별 등락률</CardTitle>
        <CardDescription className="text-[12px] leading-relaxed">
          각 칸은 전월 종가 대비 변화율이에요. 연간 열은 그 열두 칸을 복리로 곱한 값이라 범위가 달라
          색을 칠하지 않았어요.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <MonthlyReturnHeatmap rows={monthlyReturnRows} />
        <p className="text-[10px] text-muted-foreground">
          2010년 8월부터의 blockchain.com 달러 종가 기준
        </p>
      </CardContent>
    </Card>
  );
};

export default CagrScreen;
