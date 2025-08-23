import { useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { getCurrentDate } from "@/shared/lib/date";
import { isDev } from "@/shared/utils/common";
import { ExRateTypes } from "@/shared/stores/store.interface";

interface ICurrency {
  currencyUnit: string;  // 통화 단위, 예: "달러", "원"
  subValue: string;      // 표시용 값, 예: "1 달러", "1,391 원"
  value: string;         // 실제 숫자값 문자열, 예: "1", "1,391"
}

interface INaverExchangeRateResponse {
  pkid: number;              // API 식별 ID, 예: 141
  count: number;             // 결과 개수, 예: 1
  country: ICurrency[];      // 통화 정보 배열
  calculatorMessage: string; // 메시지, 보통 빈 문자열
}

const apiUrl = `https://m.search.naver.com/p/csearch/content/qapirender.nhn?key=calculator&pkid=141&q=%ED%99%98%EC%9C%A8&where=m&u1=keb&u6=standardUnit&u7=0&u3=USD&u4=KRW&u8=down&u2=1`;

export default function useUsdExchangeRate() {
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const setExRate = useStore(state => state.setExRate);

  const query = useQuery<INaverExchangeRateResponse, Error>({
    queryKey: ["usd-exchange-rate"],
    queryFn: async () => {
      const res = await fetch(apiUrl);

      if (!res.ok) throw new Error("환율 데이터를 가져올 수 없습니다.");
      return res.json() as Promise<INaverExchangeRateResponse>;
    },
    enabled: !isUsdtStandard,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 1000 * 60 * 1,
    refetchOnWindowFocus: true,
  });

  const parseExchangeRate = useCallback((res: INaverExchangeRateResponse): ExRateTypes | null => {
    const krwData = res?.country?.find(c => c.currencyUnit === "원");
    if (!krwData) return null;

    // 문자열에서 쉼표 제거 후 숫자로 변환
    const value = parseFloat(krwData.value.replace(/,/g, ""));

    // 오늘 날짜 YYYY-MM-DD
    const date = getCurrentDate();

    return { value, date };
  }, []);

  const onError = useCallback(() => {
    console.error(query.error);
    setExRate({ value: 0, date: "Update error." });
    toast.error("환율 데이터를 가져올 수 없습니다.");
  }, [])


  useEffect(() => {
    if (query.data) {
      const exRateData = parseExchangeRate(query.data);
      if (exRateData) {
        setExRate(exRateData);
        if (isDev) { console.log("✅ 환율 데이터 초기화!"); }

        return;
      }
    }
    onError();
  }, [query.data]);

  useEffect(() => {
    if (query.error) {
      onError();
    }
  }, [query.error]);

  return query;
}