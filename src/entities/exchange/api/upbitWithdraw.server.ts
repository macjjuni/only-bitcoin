import { buildNetworkKey, EXCHANGE_META, WITHDRAW_FEE_FALLBACK } from "../model/fallback";
import type { ExchangeWithdrawOption, WithdrawAsset } from "../model/types";
import { type ExchangeFetchResult, parseQuantity, TARGET_ASSETS } from "./shared";

// region [Types]
interface UpbitWithdrawFeeCondition {
  currency: string;
  net_type: string;
  network_name: string;
  withdraw_fee: string | null;
  minimum: string | null;
}

interface UpbitWithdrawFeeResponse {
  withdraw_fee_conditions: UpbitWithdrawFeeCondition[];
  base_time: string;
}
// endregion

// region [Privates]
/**
 * 업비트 수수료 엔드포인트.
 *
 * **`ccx.upbit.com/robots.txt` 는 `Disallow: /` 임.** ( `www.upbit.com` 도 동일 )
 * 그래서 캐시를 24시간으로 길게 잡아 호출을 하루 수 회 수준으로 억제함.
 * 값이 필요할 뿐 트래픽을 쓸 이유는 없으므로 이보다 짧게 줄이지 말 것.
 *
 * 점검 상태 같은 실시간 필드는 이 응답에 없어서 짧게 캐싱할 이득도 없음.
 * 응답의 `base_time` 이 매일 06:00 KST 라 데이터 자체도 하루 한 번 갱신됨.
 */
const UPBIT_WITHDRAW_FEE_URL = "https://ccx.upbit.com/api/v1/status/withdraw_fee";

/** 캐시 주기(초). 24시간. 위 주석 참고 — 줄이지 말 것. */
export const UPBIT_WITHDRAW_REVALIDATE_SECONDS = 60 * 60 * 24;

const buildFallbackResult = (): ExchangeFetchResult => ({
  meta: { ...EXCHANGE_META.upbit, source: "fallback" },
  options: { ...WITHDRAW_FEE_FALLBACK.upbit },
  usdtKrwPrice: null,
});
// endregion

// region [Transactions]
/**
 * 업비트의 BTC·USDT 출금 조건을 망별로 조회함.
 *
 * 실패 시 폴백을 돌려줌. 폴백 값은 사람이 마지막으로 확인한 시점의 것이라
 * 화면에서 `source` 로 구분해 표시해야 함.
 */
export async function fetchUpbitWithdrawInfo(): Promise<ExchangeFetchResult> {
  try {
    const response = await fetch(UPBIT_WITHDRAW_FEE_URL, {
      next: { revalidate: UPBIT_WITHDRAW_REVALIDATE_SECONDS },
      headers: {
        accept: "application/json",
        "user-agent": "only-btc.app (+https://only-btc.app)",
      },
    });

    if (!response.ok) {
      console.warn(`[upbit] 출금 정보 조회 실패: HTTP ${response.status}`);
      return buildFallbackResult();
    }

    const body = (await response.json()) as UpbitWithdrawFeeResponse;
    const options: Record<string, ExchangeWithdrawOption> = {};

    for (const row of body.withdraw_fee_conditions ?? []) {
      if (!TARGET_ASSETS.includes(row.currency as WithdrawAsset)) continue;

      const withdrawFee = parseQuantity(row.withdraw_fee);
      if (withdrawFee === null) continue;

      options[buildNetworkKey(row.currency as WithdrawAsset, row.network_name)] = {
        withdrawFee,
        minimumWithdraw: parseQuantity(row.minimum),
        // 이 엔드포인트는 점검 상태를 안 줌. "가능" 이 아니라 "모름" 이므로 null 유지.
        isWithdrawAvailable: null,
        suspensionMessage: null,
      };
    }

    if (!options[buildNetworkKey("BTC", "Bitcoin")]) {
      console.warn("[upbit] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return buildFallbackResult();
    }

    return {
      meta: { ...EXCHANGE_META.upbit, source: "live" },
      options,
      usdtKrwPrice: null,
    };
  } catch (error) {
    console.warn("[upbit] 출금 정보 조회 중 예외:", error);
    return buildFallbackResult();
  }
}
// endregion
