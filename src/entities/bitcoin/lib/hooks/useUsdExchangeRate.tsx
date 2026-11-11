import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { getCurrentDate } from "@/shared/lib/date";
import useSettingStore from "@/shared/stores/settingStore";
import { isDev } from "@/shared/utils/common";
import useBitcoinStore from "../../model/bitcoinStore";
import type { ExRateTypes } from "../../model/exRateSlice";
import {
  NAVER_EXCHANGE_RATE_URL,
  type NaverExchangeRateResponse,
  parseUsdExchangeRate,
} from "../exchange-rate";

export default function useUsdExchangeRate() {
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);
  const setExRate = useBitcoinStore((state) => state.setExRate);

  const query = useQuery<NaverExchangeRateResponse, Error>({
    queryKey: ["usd-exchange-rate"],
    queryFn: async () => {
      const res = await fetch(NAVER_EXCHANGE_RATE_URL);
      if (!res.ok) throw new Error("환율 데이터를 가져올 수 없습니다.");
      return res.json() as Promise<NaverExchangeRateResponse>;
    },
    enabled: !isUsdtStandard,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 1000 * 60 * 1,
    refetchOnWindowFocus: true,
  });

  const parseExchangeRate = useCallback((res: NaverExchangeRateResponse): ExRateTypes | null => {
    const value = parseUsdExchangeRate(res);
    if (value === null) return null;

    return { value, date: getCurrentDate() };
  }, []);

  /**
   * 조회 실패 처리.
   *
   * 받아 둔 환율이 있으면 그대로 둠. 1분마다 다시 받는데 한 번 실패했다고 0 으로
   * 덮으면 프리미엄 계산이 전부 깨짐. 한 번도 못 받았을 때만 실패 표시를 남김.
   */
  const markExchangeRateError = useCallback(
    (error: unknown) => {
      console.error("환율 데이터 업데이트 실패:", error);

      if (useBitcoinStore.getState().exRate.value === 0) {
        setExRate({ value: 0, date: "Update error." });
      }
    },
    [setExRate],
  );

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const exRateData = parseExchangeRate(query.data);

    if (!exRateData) {
      markExchangeRateError(new Error("환율 응답에 원화 항목이 없습니다."));
      return;
    }

    setExRate(exRateData);
    if (isDev) {
      console.log("✅ 환율 데이터 초기화!");
    }
  }, [query.data, isUsdtStandard]);

  useEffect(() => {
    if (query.error) {
      markExchangeRateError(query.error);
    }
  }, [query.error]);

  return query;
}
