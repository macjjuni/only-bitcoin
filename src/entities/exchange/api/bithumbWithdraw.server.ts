import { buildNetworkKey, EXCHANGE_META } from "../model/fallback";
import type { ExchangeWithdrawOption } from "../model/types";
import {
  buildExchangeFallbackResult,
  type ExchangeFetchResult,
  parseQuantity,
  TARGET_ASSETS,
  WITHDRAW_REVALIDATE_SECONDS,
} from "./shared";

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
  coinKrwSise: number | null;
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

const buildFallbackResult = () => buildExchangeFallbackResult("bithumb");
// endregion

// region [Transactions]
/**
 * 빗썸의 BTC·USDT 출금 조건을 망별로 조회함.
 *
 * 실패하면 예외를 던지지 않고 폴백을 돌려줌. 이 화면은 비교가 목적이라
 * 한 거래소가 죽어도 나머지는 보여줘야 함.
 *
 * `isWithdrawAvailable`( 출금 점검 여부 )은 수시로 바뀌지만, 다른 거래소와 같은 시점의
 * 값으로 맞추는 쪽을 택해 12시간 주기를 씀. 화면에도 조회 시각을 같이 표시함.
 */
export async function fetchBithumbWithdrawInfo(): Promise<ExchangeFetchResult> {
  try {
    const response = await fetch(BITHUMB_COIN_INOUT_URL, {
      next: { revalidate: WITHDRAW_REVALIDATE_SECONDS },
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[bithumb] 출금 정보 조회 실패: HTTP ${response.status}`);
      return buildFallbackResult();
    }

    const body = (await response.json()) as BithumbCoinInOutResponse;
    const options: Record<string, ExchangeWithdrawOption> = {};

    for (const asset of TARGET_ASSETS) {
      const coin = body.data?.find((item) => item.coinSymbol === asset);
      if (!coin) continue;

      for (const network of coin.networkInfoList ?? []) {
        const withdrawFee = parseQuantity(network.withdrawFeeQuantity);
        if (withdrawFee === null) continue;

        options[buildNetworkKey(asset, network.networkName)] = {
          withdrawFee,
          minimumWithdraw: parseQuantity(network.withdrawMinimumQuantity),
          isWithdrawAvailable: network.isWithdrawAvailable ?? null,
          suspensionMessage: network.suspensionMessage || null,
        };
      }
    }

    // BTC 온체인이 없으면 응답 형태가 바뀐 것으로 보고 통째로 폴백.
    if (!options[buildNetworkKey("BTC", "Bitcoin")]) {
      console.warn("[bithumb] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return buildFallbackResult();
    }

    return {
      meta: { ...EXCHANGE_META.bithumb, source: "live" },
      options,
    };
  } catch (error) {
    console.warn("[bithumb] 출금 정보 조회 중 예외:", error);
    return buildFallbackResult();
  }
}
// endregion
