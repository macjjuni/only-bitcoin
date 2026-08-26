import type { ExchangeMeta, ExchangeWithdrawOption, WithdrawAsset } from "../model/types";

/**
 * 비교 대상 자산.
 *
 * USDT 는 권장 대상이 아니라 "출금 수수료 = 거래소 정책" 이라는 근거로 씀.
 * ( `WithdrawAsset` 주석 참고 )
 */
export const TARGET_ASSETS: readonly WithdrawAsset[] = ["BTC", "USDT"];

export interface ExchangeFetchResult {
  meta: ExchangeMeta;
  /** `자산:망` 키. 두 거래소가 같은 망 표기를 써서 그대로 조인됨. */
  options: Record<string, ExchangeWithdrawOption>;
  /** 이 거래소가 USDT 원화 시세를 같이 주면 담음. 없으면 null. */
  usdtKrwPrice: number | null;
}

/** 숫자 문자열을 수로 바꿈. 빈 값·비정상 값은 null 로 흡수함. */
export function parseQuantity(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
