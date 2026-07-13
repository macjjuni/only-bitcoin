import type { InitialPrice } from "../model/types";

// region [Types]
interface BithumbTickerResponse {
  status: string;
  data?: {
    closing_price: string;
    fluctate_rate_24H: string;
  };
}

interface BinanceTickerResponse {
  lastPrice: string;
  priceChangePercent: string;
}
// endregion

// region [Privates]
const BITHUMB_TICKER_URL = "https://api.bithumb.com/public/ticker/BTC_KRW";
const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT";

/** 서버 렌더링용 캐시 주기(초). 봇에게 보여줄 값이므로 실시간성보다 캐시 적중이 중요하다. */
const REVALIDATE_SECONDS = 300;

const EMPTY_PRICE: InitialPrice = {
  krw: 0,
  krwChange24h: "0",
  usd: 0,
  usdChange24h: "0",
};

/**
 * 외부 거래소 REST 호출. 실패해도 렌더링은 계속되어야 하므로 null 로 흡수한다.
 */
const fetchTicker = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`초기 시세 조회 실패: ${url}`, error);
    return null;
  }
};
// endregion

// region [Transactions]
/**
 * SSR 초기 시세 조회.
 *
 * 소켓은 브라우저에서만 연결되므로 서버 HTML 에는 0 이 박힌다. 크롤러가 보는 것이 그 0 이라,
 * 스토어 기본 마켓(빗썸/바이낸스)의 REST 티커를 서버에서 한 번 읽어 초기값으로 심는다.
 * 클라이언트에서 소켓이 붙으면 이 값은 곧바로 실시간 값으로 대체된다.
 *
 * 두 거래소 중 하나가 실패해도 나머지 값은 그대로 사용한다.
 */
export const fetchInitialPrice = async (): Promise<InitialPrice> => {
  const [bithumb, binance] = await Promise.all([
    fetchTicker<BithumbTickerResponse>(BITHUMB_TICKER_URL),
    fetchTicker<BinanceTickerResponse>(BINANCE_TICKER_URL),
  ]);

  const bithumbData = bithumb?.status === "0000" ? bithumb.data : undefined;

  return {
    krw: bithumbData ? Number(bithumbData.closing_price) : EMPTY_PRICE.krw,
    krwChange24h: bithumbData ? bithumbData.fluctate_rate_24H : EMPTY_PRICE.krwChange24h,
    usd: binance ? Number(binance.lastPrice) : EMPTY_PRICE.usd,
    usdChange24h: binance ? binance.priceChangePercent : EMPTY_PRICE.usdChange24h,
  };
};
// endregion
