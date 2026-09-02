import type { VenueId } from "./types";

/** 렌더링·집계 순서를 고정하기 위한 거래소 목록. */
export const VENUE_IDS: readonly VenueId[] = ["binance", "coinbase", "upbit"] as const;

/** 거래소별 표시용 이름과 가격 통화. 통화가 다르므로 가격은 절대 합산하지 않는다. */
export const VENUE_LABELS: Record<VenueId, { name: string; quoteCurrency: string }> = {
  binance: { name: "Binance", quoteCurrency: "USDT" },
  coinbase: { name: "Coinbase", quoteCurrency: "USD" },
  upbit: { name: "Upbit", quoteCurrency: "KRW" },
};

export const BINANCE_SYMBOL = "BTCUSDT";
export const COINBASE_PRODUCT_ID = "BTC-USD";
export const UPBIT_MARKET_CODE = "KRW-BTC";
export const UPBIT_ORDERBOOK_DEPTH = 30;

/** 오더북 diff 와 체결을 한 소켓에서 받는 결합 스트림. */
export const BINANCE_STREAM_URL =
  "wss://stream.binance.com:9443/stream?streams=btcusdt@depth@100ms/btcusdt@aggTrade";

/**
 * Binance 오더북 기준점.
 *
 * `depth@100ms` 는 변경분만 주므로 REST 스냅샷 없이는 오더북을 만들 수 없다.
 * 이 엔드포인트는 `Access-Control-Allow-Origin: *` 를 주어 브라우저에서 직접 부를 수 있다.
 */
export const BINANCE_DEPTH_SNAPSHOT_URL = `https://api.binance.com/api/v3/depth?symbol=${BINANCE_SYMBOL}&limit=1000`;

export const COINBASE_STREAM_URL = "wss://advanced-trade-ws.coinbase.com";
export const UPBIT_STREAM_URL = "wss://api.upbit.com/websocket/v1";

/** 호가 불균형을 계산할 mid 기준 대역(베이시스 포인트). */
export const IMBALANCE_BAND_IN_BPS = 25;

/** 체결 압력 집계 창. */
export const TRADE_WINDOW_IN_MS = 5000;

/** 모멘텀 산출에 쓰는 과거 mid 참조 시점. */
export const MOMENTUM_WINDOW_IN_MS = 3000;

/** 모멘텀을 ±1 로 정규화할 때의 기준 변동폭(베이시스 포인트). */
export const MOMENTUM_REFERENCE_IN_BPS = 8;

/** venuePressure 가중치. 합은 1 이다. */
export const PRESSURE_WEIGHTS = {
  tradePressure: 0.55,
  bookImbalance: 0.3,
  momentum: 0.15,
} as const;

/** 마지막 수신 이후 이 시간을 넘기면 stale 로 본다. */
export const STALE_THRESHOLD_IN_MS = 6000;

/** 0 나눗셈 방어값. */
export const EPSILON = 1e-9;

/** 중복 체결 ID 캐시 상한. 거래소당 이 개수만 기억한다. */
export const TRADE_ID_CACHE_LIMIT = 4000;

/** 캔버스가 소비하기 전까지 쌓아 둘 체결 이벤트 상한. */
export const TRADE_EVENT_QUEUE_LIMIT = 512;

/** 백분위 계산에 쓰는 최근 체결량 표본 수. */
export const TRADE_SIZE_SAMPLE_LIMIT = 400;

/** mid 가격 히스토리 표본 수. 100ms 간격 기준 약 10 초치. */
export const MID_PRICE_SAMPLE_LIMIT = 128;

/** 재연결 지연 기본값. 인스턴스마다 지터를 더해 3거래소 동시 재연결을 흩는다. */
export const RECONNECT_MIN_DELAY_IN_MS = 900;
export const RECONNECT_MAX_DELAY_IN_MS = 12000;
export const RECONNECT_JITTER_IN_MS = 700;

/** 아직 지연을 한 번도 재지 못한 상태. 실제로 0ms 로 측정된 경우와 구분한다. */
export const UNKNOWN_LATENCY_IN_MS = -1;
