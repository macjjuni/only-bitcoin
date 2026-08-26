import { WITHDRAW_FEE_FALLBACK } from "../model/fallback";
import type { ExchangeWithdrawInfo } from "../model/types";

// region [Types]
interface BithumbNetworkInfo {
  networkName: string;
  isWithdrawAvailable: boolean;
  withdrawFeeQuantity: string | null;
  withdrawMinimumQuantity: string | null;
  suspensionMessage: string | null;
}

interface BithumbCoinInfo {
  coinSymbol: string;
  networkInfoList: BithumbNetworkInfo[];
}

interface BithumbCoinInOutResponse {
  status: string;
  data: BithumbCoinInfo[];
}
// endregion

// region [Privates]
/**
 * 웹 프론트가 쓰는 게이트웨이라 문서화된 공개 API 가 아님. 예고 없이 스펙이 바뀔 수 있으므로
 * 파싱이 조금이라도 어긋나면 폴백으로 떨어뜨림. ( 네이버 환율 엔드포인트와 같은 성격 )
 *
 * `www.bithumb.com/robots.txt` 는 전체 허용이라 수집 자체는 막지 않음.
 */
const BITHUMB_COIN_INOUT_URL = "https://gw.bithumb.com/exchange/v1/coin-inout/info";

/**
 * 캐시 주기(초). 10분.
 *
 * 수수료 자체는 거의 안 바뀌지만 `isWithdrawAvailable`( 출금 점검 여부 )은 수시로 바뀜.
 * 실시간 가치가 있는 쪽이 이 필드라 주기를 짧게 잡음.
 */
export const BITHUMB_WITHDRAW_REVALIDATE_SECONDS = 60 * 10;

/** 숫자 문자열을 수로 바꿈. 빈 값·비정상 값은 null 로 흡수함. */
const parseQuantity = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
// endregion

// region [Transactions]
/**
 * 빗썸 BTC 온체인 출금 정보를 조회함.
 *
 * 실패하면 예외를 던지지 않고 폴백을 돌려줌. 이 화면은 수수료 비교가 목적이라
 * 한 거래소가 죽어도 나머지는 보여줘야 함.
 */
export async function fetchBithumbWithdrawInfo(): Promise<ExchangeWithdrawInfo> {
  try {
    const response = await fetch(BITHUMB_COIN_INOUT_URL, {
      next: { revalidate: BITHUMB_WITHDRAW_REVALIDATE_SECONDS },
      headers: {
        accept: "application/json",
        // 정체를 숨기지 않음. 문제가 되면 상대가 연락할 수 있어야 함.
        "user-agent": "only-btc.app (+https://only-btc.app)",
      },
    });

    if (!response.ok) {
      console.warn(`[bithumb] 출금 정보 조회 실패: HTTP ${response.status}`);
      return WITHDRAW_FEE_FALLBACK.bithumb;
    }

    const body = (await response.json()) as BithumbCoinInOutResponse;
    const btc = body.data?.find((coin) => coin.coinSymbol === "BTC");
    // 라이트닝 등 다른 망이 섞여 들어오므로 온체인(Bitcoin) 망만 고름.
    const onChain = btc?.networkInfoList?.find((net) => net.networkName === "Bitcoin");
    const withdrawFeeInBtc = parseQuantity(onChain?.withdrawFeeQuantity);

    if (withdrawFeeInBtc === null) {
      console.warn("[bithumb] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return WITHDRAW_FEE_FALLBACK.bithumb;
    }

    return {
      ...WITHDRAW_FEE_FALLBACK.bithumb,
      withdrawFeeInBtc,
      minimumWithdrawInBtc: parseQuantity(onChain?.withdrawMinimumQuantity),
      isWithdrawAvailable: onChain?.isWithdrawAvailable ?? null,
      suspensionMessage: onChain?.suspensionMessage || null,
      source: "live",
    };
  } catch (error) {
    console.warn("[bithumb] 출금 정보 조회 중 예외:", error);
    return WITHDRAW_FEE_FALLBACK.bithumb;
  }
}
// endregion
