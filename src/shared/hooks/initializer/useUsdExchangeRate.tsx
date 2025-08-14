import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { isDev } from "@/shared/utils/common";

interface IExRateRes {
  krw: number;
  updated: string;
}

const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exchange-rate`;

export default function useUsdExchangeRate() {
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const setExRate = useStore(state => state.setExRate);

  const query = useQuery<IExRateRes, Error>({
    queryKey: ["usd-exchange-rate"],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("환율 데이터를 가져올 수 없습니다.");
      return res.json() as Promise<IExRateRes>;
    },
    enabled: !isUsdtStandard,
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) {
      setExRate({ value: query.data.krw, date: query.data.updated });
      if (isDev) console.log("✅ 환율 데이터 초기화!");
    }
  }, [query.data]);

  useEffect(() => {
    if (query.error) {
      console.error(query.error);
      setExRate({ value: 0, date: "Update error." });
      toast.error("환율 데이터를 가져올 수 없습니다.");
    }
  }, [query.error]);

  return query;
}