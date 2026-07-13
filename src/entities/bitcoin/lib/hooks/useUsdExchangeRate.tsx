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

  const onError = useCallback(() => {
    if (!query?.error) {
      return;
    }

    console.error(query.error);
    setExRate({ value: 0, date: "Update error." });
  }, []);

  useEffect(() => {
    if (query.data) {
      const exRateData = parseExchangeRate(query.data);
      if (exRateData) {
        setExRate(exRateData);
        if (isDev) {
          console.log("✅ 환율 데이터 초기화!");
        }
        return;
      }
    }
    onError();
  }, [query.data, isUsdtStandard]);

  useEffect(() => {
    if (query.error) {
      onError();
    }
  }, [query.error]);

  return query;
}
