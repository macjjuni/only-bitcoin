import type { ExchangeId, ExchangeMeta, ExchangeWithdrawOption, WithdrawAsset } from "./types";

/**
 * 마지막으로 사람이 눈으로 확인한 날.
 *
 * 폴백 값이 화면에 나갈 때 이 날짜를 같이 보여줌. 값을 고칠 때 날짜도 같이 고칠 것.
 */
export const WITHDRAW_FEE_VERIFIED_AT = "2026-08-26" as const;

const createFallbackWithdrawOption = (
  withdrawFee: number,
  minimumWithdraw: number | null,
): ExchangeWithdrawOption => ({
  withdrawFee,
  minimumWithdraw,
  isWithdrawAvailable: null,
  suspensionMessage: null,
});

export const EXCHANGE_META: Record<ExchangeId, Omit<ExchangeMeta, "source">> = {
  upbit: {
    id: "upbit",
    name: "업비트",
    referenceUrl: "https://www.upbit.com/service_center/fees?tab=dtw_fees",
  },
  bithumb: {
    id: "bithumb",
    name: "빗썸",
    referenceUrl: "https://www.bithumb.com/react/info/fee/inout",
  },
  korbit: {
    id: "korbit",
    name: "코빗",
    referenceUrl:
      "https://www.korbit.co.kr/faq/list/?category=nwYLcgEpuQIHk0chKI0PV&article=5SrSC3yggkWhcSL0O1KSz4",
  },
  binance: {
    id: "binance",
    name: "바이낸스",
    referenceUrl: "https://www.binance.com/en/fee/cryptoFee",
  },
  kraken: {
    id: "kraken",
    name: "크라켄",
    referenceUrl:
      "https://support.kraken.com/articles/360000767986-cryptocurrency-withdrawal-fees-and-minimums",
  },
};

/** 조회 실패 시 쓰는 값의 키. `자산:망` 형태로 거래소 응답을 조인함. */
export const buildNetworkKey = (asset: WithdrawAsset, networkName: string) =>
  `${asset}:${networkName}`;

/**
 * 조회 실패 시 쓰는 값.
 *
 * 거래소가 수수료를 바꿔도 여기는 안 따라가므로 **틀린 값이 나갈 수 있음.**
 * 그래서 폴백으로 떨어지면 화면에 반드시 티를 내야 함. ( `source: "fallback"` )
 * 실제로 작업 중 업비트 BTC 수수료를 0.0009 로 알고 있다가 조회해 보니 0.0002 였음.
 */
export const WITHDRAW_FEE_FALLBACK: Record<ExchangeId, Record<string, ExchangeWithdrawOption>> = {
  upbit: {
    "BTC:Bitcoin": createFallbackWithdrawOption(0.0002, 0.00001),
    "USDT:Tron": createFallbackWithdrawOption(0, 0.000001),
    "USDT:Ethereum": createFallbackWithdrawOption(4, 0.000001),
    "USDT:Kaia": createFallbackWithdrawOption(0.1, 0.000001),
    "USDT:Aptos": createFallbackWithdrawOption(0.1, 0.000001),
  },
  bithumb: {
    "BTC:Bitcoin": createFallbackWithdrawOption(0.0002, 0.001),
    "USDT:Tron": createFallbackWithdrawOption(0, 0.000001),
    "USDT:Ethereum": createFallbackWithdrawOption(4, 4),
    "USDT:Kaia": createFallbackWithdrawOption(0.1, 0.1),
    "USDT:Aptos": createFallbackWithdrawOption(0.1, 0.1),
  },
  korbit: {
    "BTC:Bitcoin": createFallbackWithdrawOption(0.0008, 0.0001),
    "USDT:Tron": createFallbackWithdrawOption(1, 1),
    "USDT:Ethereum": createFallbackWithdrawOption(1, 0.1),
  },
  binance: {
    "BTC:Bitcoin": createFallbackWithdrawOption(0.00002, 0.0001),
    "BTC:Lightning": createFallbackWithdrawOption(0.000001, 0.00002),
    "USDT:Tron": createFallbackWithdrawOption(1.5, 5),
    "USDT:Ethereum": createFallbackWithdrawOption(0.3, 5),
    "USDT:Kaia": createFallbackWithdrawOption(0.02, 5),
    "USDT:Aptos": createFallbackWithdrawOption(0.1, 5),
  },
  kraken: {
    "BTC:Bitcoin": createFallbackWithdrawOption(0.000015, 0.000218),
    "BTC:Lightning": createFallbackWithdrawOption(0, 0.00001),
    "USDT:Tron": createFallbackWithdrawOption(1, 6),
    "USDT:Ethereum": createFallbackWithdrawOption(0.6286, 0.75432),
  },
};
