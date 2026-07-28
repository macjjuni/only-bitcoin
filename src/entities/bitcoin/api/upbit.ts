import fetcher from "@/shared/utils/fetcher";
import type { MarketChartFormattedData } from "../model/market";

export interface UpbitCandle {
  candle_date_time_kst: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  timestamp: number;
  candle_acc_trade_price: number;
  candle_acc_trade_volume: number;
}

export type UpbitCandleType = "minutes/5" | "minutes/60" | "minutes/240" | "days";

/**
 * 업비트(Upbit) REST API 캔들 데이터 조회 및 마켓 차트 포맷으로 변환
 * - 1D: minutes/5 (200개)
 * - 7D: minutes/60 (168개)
 * - 30D: minutes/240 (180개)
 */
export async function fetchUpbitCandles(
  type: UpbitCandleType,
  count: number = 200,
): Promise<MarketChartFormattedData> {
  try {
    const url = `https://api.upbit.com/v1/candles/${type}?market=KRW-BTC&count=${count}`;
    const data = await fetcher<UpbitCandle[]>(url);

    if (!Array.isArray(data) || data.length === 0) {
      return { date: [], price: [] };
    }

    // 업비트는 최신 데이터가 index 0으로 오므로 과거->최신 순으로 reverse
    const sorted = [...data].reverse();

    return {
      date: sorted.map((item) => item.timestamp),
      price: sorted.map((item) => item.trade_price),
    };
  } catch (error) {
    console.error("❌ 업비트 캔들 데이터 패치 실패:", error);
    return { date: [], price: [] };
  }
}
