import { WITHDRAW_FEE_FALLBACK } from "../model/fallback";
import type { ExchangeWithdrawInfo } from "../model/types";

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
 */
const UPBIT_WITHDRAW_FEE_URL = "https://ccx.upbit.com/api/v1/status/withdraw_fee";

/** 캐시 주기(초). 24시간. 위 주석 참고 — 줄이지 말 것. */
export const UPBIT_WITHDRAW_REVALIDATE_SECONDS = 60 * 60 * 24;

const parseQuantity = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
// endregion

// region [Transactions]
/**
 * 업비트 BTC 온체인 출금 정보를 조회함.
 *
 * 실패 시 폴백을 돌려줌. 폴백 값은 사람이 마지막으로 확인한 시점의 것이라
 * 화면에서 `source` 로 구분해 표시해야 함.
 */
export async function fetchUpbitWithdrawInfo(): Promise<ExchangeWithdrawInfo> {
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
      return WITHDRAW_FEE_FALLBACK.upbit;
    }

    const body = (await response.json()) as UpbitWithdrawFeeResponse;
    // `currency` 만 보면 다른 체인 위의 BTC 가 섞이므로 `net_type` 까지 확인함.
    const onChain = body.withdraw_fee_conditions?.find(
      (item) => item.currency === "BTC" && item.net_type === "BTC",
    );
    const withdrawFeeInBtc = parseQuantity(onChain?.withdraw_fee);

    if (withdrawFeeInBtc === null) {
      console.warn("[upbit] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return WITHDRAW_FEE_FALLBACK.upbit;
    }

    return {
      ...WITHDRAW_FEE_FALLBACK.upbit,
      withdrawFeeInBtc,
      minimumWithdrawInBtc: parseQuantity(onChain?.minimum),
      // 이 엔드포인트는 점검 상태를 안 줌. "가능" 이 아니라 "모름" 이므로 null 유지.
      isWithdrawAvailable: null,
      source: "live",
    };
  } catch (error) {
    console.warn("[upbit] 출금 정보 조회 중 예외:", error);
    return WITHDRAW_FEE_FALLBACK.upbit;
  }
}
// endregion
