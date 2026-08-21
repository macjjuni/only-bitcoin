import { getBtcMonthlyUsdMap } from "@/entities/bitcoin/server";
import { Card, CardContent } from "@/shared/ui";
import { buildMonthlyReturnGrid } from "../lib/buildMonthlyReturnGrid";
import CagrTitle from "./CagrTitle";
import MonthlyReturnHeatmap from "./MonthlyReturnHeatmap";

/**
 * 월별 등락률 화면 구성.
 *
 * 타이틀은 카드 바깥에 둠( `btc2apartment` 와 같은 구성 ). 카드 안에 또 제목을 넣으면
 * 같은 말이 위아래로 두 번 보이므로 카드는 설명과 표만 담음.
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
    <>
      <CagrTitle />

      <Card className="w-full">
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            각 칸은 전월 종가 대비 변화율이에요. 연간 열은 그 열두 칸을 복리로 곱한 값이라 범위가
            달라 색을 칠하지 않았어요.
          </p>

          <MonthlyReturnHeatmap rows={monthlyReturnRows} />

          <p className="text-[10px] text-muted-foreground">
            2010년 8월부터의 blockchain.com 달러 종가 기준
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default CagrScreen;
