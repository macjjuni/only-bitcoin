export type ExchangeId = "upbit" | "bithumb";

/** 값의 출처. 화면에 신선도를 표시하고, 폴백일 때 경고를 띄우는 데 씀. */
export type WithdrawFeeSource = "live" | "fallback";

/** 거래소 한 곳의 BTC 온체인 출금 정보. 거래소별 응답을 이 형태로 정규화함. */
export interface ExchangeWithdrawInfo {
  id: ExchangeId;
  name: string;
  /** BTC 단위 출금 수수료. */
  withdrawFeeInBtc: number;
  /** 최소 출금 수량(BTC). 거래소가 안 주면 null. */
  minimumWithdrawInBtc: number | null;
  /**
   * 출금 가능 여부.
   *
   * `null` 은 "가능"이 아니라 **"거래소가 이 정보를 안 준다"** 는 뜻임.
   * 업비트 수수료 엔드포인트에는 점검 상태가 없어서 항상 null 임. 화면에서 구분해 표시할 것.
   */
  isWithdrawAvailable: boolean | null;
  /** 점검 사유 등 거래소가 내려주는 안내 문구. */
  suspensionMessage: string | null;
  source: WithdrawFeeSource;
  /** 거래소 수수료 안내 페이지. 사용자가 직접 확인할 수 있게 링크로 검. */
  referenceUrl: string;
}

export interface ExchangeWithdrawSnapshot {
  exchanges: ExchangeWithdrawInfo[];
  /** 조회 시각(ISO). 하나라도 폴백이면 그 값은 이 시각과 무관함. */
  fetchedAt: string;
  /** 전부 폴백으로 떨어졌는지. 화면에 경고를 띄울 때 씀. */
  hasAllFallback: boolean;
}
