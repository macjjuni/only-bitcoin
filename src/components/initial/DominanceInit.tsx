import { useCallback, useLayoutEffect } from "react";
import { getCurrencies } from "@/api/dominance";
import { getDominance, isDev } from "@/utils/common";
import { valueCheck } from "@/utils/string";
import { calcCurrentDateDifference, getCurrentDate } from "@/utils/date";
import { useBearStore, bearStore } from "@/store";
import interval from "@/utils/interval";

const limitMins = 10; // 분(min)
const intervalTime = 5 * 60000; // Interval Time(ms): 5분

const DominanceInit = () => {
  const dominance = useBearStore((state) => state.dominance);
  // BTC 도미넌스 데이터 초기화
  const updateDominance = useCallback(async () => {
    const res = await getCurrencies();
    if (res) {
      const dominanceDate = { value: `${getDominance(res)}%`, date: getCurrentDate() };
      bearStore.updateDominance(dominanceDate);
    }
  }, []);

  // 업데이트 시간 체크해서 업데이트 실행
  const updateCheck = useCallback(() => {
    const valCheck = valueCheck(dominance.date);
    if (!valCheck) {
      updateDominance().then();
    } else {
      const minDiff = calcCurrentDateDifference(dominance.date, "minute");
      if (minDiff > limitMins) {
        updateDominance().then();
      } // 10분 이후면 업데이트
    }
  }, []);

  useLayoutEffect(() => {
    if (isDev) console.log("✅ BTC 도미넌스 초기화");
    updateCheck();
    const blockInterval = interval(updateDominance, intervalTime);
    blockInterval.start();
  }, []);

  return null;
};

export default DominanceInit;
