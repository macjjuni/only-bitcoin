import type { ExchangeId, ExchangeWithdrawInfo } from "./types";

/**
 * 마지막으로 사람이 눈으로 확인한 날.
 *
 * 폴백 값이 화면에 나갈 때 이 날짜를 같이 보여줌. 값을 고칠 때 날짜도 같이 고칠 것.
 */
export const WITHDRAW_FEE_VERIFIED_AT = "2026-08-26" as const;

/**
 * 조회 실패 시 쓰는 값.
 *
 * 거래소가 수수료를 바꿔도 여기는 안 따라가므로 **틀린 값이 나갈 수 있음.**
 * 그래서 폴백으로 떨어지면 화면에 반드시 티를 내야 함. ( `source: "fallback"` )
 * 실제로 작업 중 업비트 수수료를 0.0009 로 알고 있다가 조회해 보니 0.0002 였음.
 */
export const WITHDRAW_FEE_FALLBACK: Record<ExchangeId, ExchangeWithdrawInfo> = {
  upbit: {
    id: "upbit",
    name: "업비트",
    withdrawFeeInBtc: 0.0002,
    minimumWithdrawInBtc: 0.00001,
    isWithdrawAvailable: null,
    suspensionMessage: null,
    source: "fallback",
    referenceUrl: "https://www.upbit.com/service_center/fees?tab=dtw_fees",
  },
  bithumb: {
    id: "bithumb",
    name: "빗썸",
    withdrawFeeInBtc: 0.0002,
    minimumWithdrawInBtc: 0.001,
    isWithdrawAvailable: null,
    suspensionMessage: null,
    source: "fallback",
    referenceUrl: "https://www.bithumb.com/react/info/fee",
  },
};
