// 조회는 `@/entities/exchange/server` 에서 가져온다. 여기는 클라이언트에서도 안전한 것만 둔다.
export { buildNetworkKey, EXCHANGE_META, WITHDRAW_FEE_VERIFIED_AT } from "./model/fallback";
export type {
  ExchangeId,
  ExchangeMeta,
  ExchangeWithdrawOption,
  ExchangeWithdrawSnapshot,
  WithdrawAsset,
  WithdrawFeeSource,
  WithdrawNetworkRow,
} from "./model/types";
