import { useQuery } from "@tanstack/react-query";
import fetcher from "@/shared/utils/fetcher";

export interface UpbitTickerResponse {
  market: string;
  trade_price: number;
  high_price: number;
  low_price: number;
  signed_change_rate: number;
  acc_trade_price_24h: number;
  acc_trade_volume_24h: number;
}

const UPBIT_TICKER_URL = "https://api.upbit.com/v1/ticker?markets=KRW-BTC";

const fetchBtcTicker = async (): Promise<UpbitTickerResponse | null> => {
  try {
    const data = await fetcher<UpbitTickerResponse[]>(UPBIT_TICKER_URL);
    return data[0] || null;
  } catch (error) {
    console.warn("❌ Upbit Ticker 조회 실패", error);
    return null;
  }
};

/** 24H 거래대금(원화)을 "3.5조", "8,500억" 형태의 한국어 가독 단위로 변환 */
export function formatKoreanVolume(volumeInKrw: number): string {
  if (!volumeInKrw || volumeInKrw <= 0) return "3.5조";
  if (volumeInKrw >= 1_000_000_000_000) {
    const cho = volumeInKrw / 1_000_000_000_000;
    return `${cho.toFixed(1)}조`;
  }
  if (volumeInKrw >= 100_000_000) {
    const eok = Math.round(volumeInKrw / 100_000_000);
    return `${eok.toLocaleString()}억`;
  }
  return `${Math.round(volumeInKrw).toLocaleString()}원`;
}

export function useBtcTickerQuery() {
  return useQuery<UpbitTickerResponse | null>({
    queryKey: ["btc-ticker-24h"],
    queryFn: fetchBtcTicker,
    staleTime: 1000 * 30, // 30초
    refetchInterval: 1000 * 30,
  });
}
