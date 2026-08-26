export type ExchangeId = "upbit" | "bithumb" | "korbit" | "binance" | "kraken";

/**
 * 비교 대상 자산.
 *
 * USDT 는 권장 대상이 아니라 **"출금 수수료가 네트워크 비용이 아니라 거래소 정책"** 이라는
 * 근거로 쓰임. 트론 USDT 가 무료인데 BTC 는 2만원대라는 대비가 그 자체로 증거임.
 */
export type WithdrawAsset = "BTC" | "USDT";

/** 값의 출처. 폴백이면 화면에 티를 내야 함. */
export type WithdrawFeeSource = "live" | "fallback";

/** 거래소 한 곳의, 특정 자산·망에 대한 출금 조건. */
export interface ExchangeWithdrawOption {
  /** 자산 단위 출금 수수료. 0 이면 무료. */
  withdrawFee: number;
  minimumWithdraw: number | null;
  /**
   * 출금 가능 여부.
   *
   * `null` 은 "가능" 이 아니라 **"거래소가 이 정보를 안 준다"** 는 뜻임.
   * 업비트 수수료 엔드포인트에는 점검 상태가 없어 항상 null 임.
   */
  isWithdrawAvailable: boolean | null;
  suspensionMessage: string | null;
}

/** 표의 한 행. 자산 + 망 조합 하나에 거래소별 조건이 달림. */
export interface WithdrawNetworkRow {
  asset: WithdrawAsset;
  /** 거래소들이 같은 표기를 쓰므로 그대로 조인 키로 씀. ( Bitcoin / Tron / Ethereum ... ) */
  networkName: string;
  /** 해당 거래소가 그 망을 지원하지 않으면 키가 없음. */
  options: Partial<Record<ExchangeId, ExchangeWithdrawOption>>;
}

/** 표의 열. */
export interface ExchangeMeta {
  id: ExchangeId;
  name: string;
  referenceUrl: string;
  source: WithdrawFeeSource;
}

export interface ExchangeWithdrawSnapshot {
  exchanges: ExchangeMeta[];
  rows: WithdrawNetworkRow[];
  fetchedAt: string;
  hasAnyFallback: boolean;
}
