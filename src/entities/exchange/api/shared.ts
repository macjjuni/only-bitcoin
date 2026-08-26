import type { ExchangeMeta, ExchangeWithdrawOption, WithdrawAsset } from "../model/types";

/**
 * 비교 대상 자산.
 *
 * USDT 는 권장 대상이 아니라 "출금 수수료 = 거래소 정책" 이라는 근거로 씀.
 * ( `WithdrawAsset` 주석 참고 )
 */
export const TARGET_ASSETS: readonly WithdrawAsset[] = ["BTC", "USDT"];

/**
 * 모든 거래소 공통 캐시 주기(초). 12시간.
 *
 * 거래소별로 주기를 달리 두면 표의 각 행이 서로 다른 시점의 값이 됨. 비교가 목적인 화면이라
 * 한 시점으로 맞추는 게 중요해서 `/withdraw-fee` 재검증 주기와 같은 값으로 통일함.
 * 업비트는 `robots.txt` 가 `Disallow: /` 이므로 이보다 짧게 줄이지 말 것.
 */
export const WITHDRAW_REVALIDATE_SECONDS = 60 * 60 * 12;

export interface ExchangeFetchResult {
  meta: ExchangeMeta;
  /** `자산:망` 키. 거래소들이 같은 망 표기를 써서 그대로 조인됨. */
  options: Record<string, ExchangeWithdrawOption>;
}

/** 숫자 문자열을 수로 바꿈. 빈 값·비정상 값은 null 로 흡수함. */
export function parseQuantity(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
