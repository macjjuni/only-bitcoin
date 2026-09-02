import { useEffect, useRef, useState } from "react";
import type { AveragePriceResult } from "../calculateAveragePrice";

/**
 * 평균가를 느리게 흘려보내는 훅.
 *
 * HUD 스냅샷은 밀도에 따라 100~250ms 마다 갱신되는데, 숫자를 굴리는 `CountText` 의
 * 애니메이션은 0.3초짜리다. 갱신이 애니메이션보다 빠르면 매번 처음부터 다시 굴러
 * 숫자를 읽을 수 없다. 표시용 값만 1초 간격으로 내보내 애니메이션이 끝날 여유를 준다.
 *
 * 압력 막대와 캔버스는 이 훅을 거치지 않으므로 원래 속도 그대로 움직인다.
 *
 * @param intervalInMs 표시값을 갱신할 간격. `CountText` 의 애니메이션 길이보다 길어야 한다.
 */
export function useThrottledAveragePrice(
  averagePrice: AveragePriceResult,
  intervalInMs: number,
): AveragePriceResult {
  //#region [Hooks]
  const [publishedAveragePrice, setPublishedAveragePrice] = useState(averagePrice);
  const latestAveragePriceReference = useRef(averagePrice);
  const hasPublishedRealPrice = publishedAveragePrice.averagePriceInUsd > 0;
  //#endregion

  //#region [Life Cycles]
  useEffect(() => {
    latestAveragePriceReference.current = averagePrice;
  }, [averagePrice]);

  /**
   * 첫 값은 간격을 기다리지 않고 바로 내보낸다.
   * 안 그러면 거래소가 붙은 뒤에도 최대 1초 동안 빈 자리가 남는다.
   */
  useEffect(() => {
    if (!hasPublishedRealPrice && averagePrice.averagePriceInUsd > 0) {
      setPublishedAveragePrice(averagePrice);
    }
  }, [averagePrice, hasPublishedRealPrice]);

  useEffect(() => {
    const publishTimerID = setInterval(() => {
      setPublishedAveragePrice(latestAveragePriceReference.current);
    }, intervalInMs);

    return () => {
      clearInterval(publishTimerID);
    };
  }, [intervalInMs]);
  //#endregion

  return publishedAveragePrice;
}
