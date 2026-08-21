import { getBtcMonthlyUsdMap } from "@/entities/bitcoin/server";
import { buildMonthlyReturnGrid } from "../lib/buildMonthlyReturnGrid";
import CagrTitle from "./CagrTitle";
import MonthlyReturnHeatmap from "./MonthlyReturnHeatmap";

/**
 * 월별 등락률 화면 구성.
 *
 * 카드로 감싸지 않음. 이 화면에 올라가는 건 표 하나뿐이라 테두리를 두르면
 * "여러 카드 중 하나" 처럼 보이고, 유리 표면 안쪽 여백만큼 좁은 화면에서
 * 보이는 열이 줄어듦. 표가 좌우로 페이지 끝까지 뻗는 편이 나음.
 *
 * 글줄은 타이틀과 같은 `px-5` 로 맞추고, 표만 그 밖으로 빠져나감.
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

      <div className="flex flex-col gap-3">
        <p className="px-5 text-[12px] leading-relaxed text-muted-foreground">
          각 칸은 전월 종가 대비 변화율이에요. 연간 열은 그 열두 칸을 복리로 곱한 값이라 범위가 달라
          색을 칠하지 않았어요.
        </p>

        <MonthlyReturnHeatmap rows={monthlyReturnRows} />

        <p className="px-5 text-[10px] text-muted-foreground">
          2010년 8월부터의 blockchain.com 달러 종가 기준
        </p>
      </div>
    </>
  );
};

export default CagrScreen;
