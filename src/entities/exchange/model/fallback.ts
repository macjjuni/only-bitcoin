import type { ExchangeId, ExchangeMeta, ExchangeWithdrawOption, WithdrawAsset } from "./types";

/**
 * 마지막으로 사람이 눈으로 확인한 날.
 *
 * 폴백 값이 화면에 나갈 때 이 날짜를 같이 보여줌. 값을 고칠 때 날짜도 같이 고칠 것.
 */
export const WITHDRAW_FEE_VERIFIED_AT = "2026-08-26" as const;

/** 조회가 실패해도 USDT 를 대략 환산할 수 있게 둔 값. 스테이블코인이라 크게 안 움직임. */
export const USDT_KRW_FALLBACK_PRICE = 1390;

export const EXCHANGE_META: Record<ExchangeId, Omit<ExchangeMeta, "source">> = {
  upbit: {
    id: "upbit",
    name: "업비트",
    referenceUrl: "https://www.upbit.com/service_center/fees?tab=dtw_fees",
  },
  bithumb: {
    id: "bithumb",
    name: "빗썸",
    referenceUrl: "https://www.bithumb.com/react/info/fee",
  },
};

/** 조회 실패 시 쓰는 값의 키. `자산:망` 형태로 두 거래소 응답을 조인함. */
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
    "BTC:Bitcoin": {
      withdrawFee: 0.0002,
      minimumWithdraw: 0.00001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Tron": {
      withdrawFee: 0,
      minimumWithdraw: 0.000001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Ethereum": {
      withdrawFee: 4,
      minimumWithdraw: 0.000001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Kaia": {
      withdrawFee: 0.1,
      minimumWithdraw: 0.000001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Aptos": {
      withdrawFee: 0.1,
      minimumWithdraw: 0.000001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
  },
  bithumb: {
    "BTC:Bitcoin": {
      withdrawFee: 0.0002,
      minimumWithdraw: 0.001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Tron": {
      withdrawFee: 0,
      minimumWithdraw: 0.000001,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Ethereum": {
      withdrawFee: 4,
      minimumWithdraw: 4,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Kaia": {
      withdrawFee: 0.1,
      minimumWithdraw: 0.1,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
    "USDT:Aptos": {
      withdrawFee: 0.1,
      minimumWithdraw: 0.1,
      isWithdrawAvailable: null,
      suspensionMessage: null,
    },
  },
};
