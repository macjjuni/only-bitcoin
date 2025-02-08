import { useCallback, useLayoutEffect } from "react";
import { calcCurrentDateDifference } from "@/utils/date";
import { getFearGreed } from "@/api/fearGreed";
import interval from "@/utils/interval";
import { useBearStore, bearStore } from "@/store";
import { isDev } from "@/utils/common";

const limitMins = 10; // 분(min)
const intervalTime = 300000; // Interval Time(ms): 5분

const FeargreedInit = () => {
  const fearGreed = useBearStore((state) => state.fearGreed);
  // 공포 탐욕 지수 데이터 초기화
  const updateFearGreedIndex = useCallback(async () => {
    const data = await getFearGreed();
    bearStore.updateFearGreed(data);
  }, []);

  // 업데이트 시간 체크해서 업데이트 실행
  const updateAction = useCallback(() => {
    if (!Number.isNaN(fearGreed.date)) {
      updateFearGreedIndex();
      return;
    }
    const minDiff = calcCurrentDateDifference(fearGreed.date, "minute");
    if (minDiff > limitMins) {
      updateFearGreedIndex();
    }
  }, []);

  useLayoutEffect(() => {
    if (isDev) console.log("✅ 공포 탐욕 지수 초기화");
    updateAction();
    const fearGreedInterval = interval(updateFearGreedIndex, intervalTime);
    fearGreedInterval.start();
  }, []);

  return null;
};

export default FeargreedInit;
