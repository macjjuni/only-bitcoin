import { buildNetworkKey, EXCHANGE_META, WITHDRAW_FEE_FALLBACK } from "../model/fallback";
import type { ExchangeWithdrawOption, WithdrawAsset } from "../model/types";
import {
  type ExchangeFetchResult,
  parseQuantity,
  TARGET_ASSETS,
  WITHDRAW_REVALIDATE_SECONDS,
} from "./shared";

// region [Types]
interface KorbitNetworkInfo {
  name: string;
  fullName: string;
  withdrawalStatus: string;
  withdrawalTxFee: string | null;
  withdrawalMinAmount: string | null;
}

interface KorbitCurrencyInfo {
  name: string;
  networkList?: KorbitNetworkInfo[];
}

interface KorbitCurrenciesResponse {
  success: boolean;
  data?: KorbitCurrencyInfo[];
}
// endregion

// region [Privates]
/** 코빗이 문서화한 공개 가상자산 정보 엔드포인트. API 키나 서명이 필요 없다. */
const KORBIT_CURRENCIES_URL = "https://api.korbit.co.kr/v2/currencies";

const buildFallbackResult = (): ExchangeFetchResult => ({
  meta: { ...EXCHANGE_META.korbit, source: "fallback" },
  options: { ...WITHDRAW_FEE_FALLBACK.korbit },
  usdtKrwPrice: null,
});

const parseWithdrawalAvailability = (withdrawalStatus: string): boolean | null => {
  if (withdrawalStatus === "launched") {
    return true;
  }

  if (withdrawalStatus === "stopped") {
    return false;
  }

  return null;
};
// endregion

// region [Transactions]
/**
 * 코빗의 BTC·USDT 출금 조건을 네트워크별로 조회한다.
 *
 * 최상위 출금 필드는 deprecated 상태이므로 `networkList` 안의 값만 사용한다.
 * 조회 또는 응답 검증에 실패하면 마지막으로 확인한 저장값을 반환한다.
 */
export async function fetchKorbitWithdrawInfo(): Promise<ExchangeFetchResult> {
  try {
    const response = await fetch(KORBIT_CURRENCIES_URL, {
      next: { revalidate: WITHDRAW_REVALIDATE_SECONDS },
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[korbit] 출금 정보 조회 실패: HTTP ${response.status}`);
      return buildFallbackResult();
    }

    const body = (await response.json()) as KorbitCurrenciesResponse;
    if (body.success !== true || !Array.isArray(body.data)) {
      console.warn("[korbit] 가상자산 정보 응답 형식이 올바르지 않음");
      return buildFallbackResult();
    }

    const options: Record<string, ExchangeWithdrawOption> = {};

    for (const currency of body.data) {
      const asset = currency.name.toUpperCase() as WithdrawAsset;
      if (!TARGET_ASSETS.includes(asset)) {
        continue;
      }

      for (const network of currency.networkList ?? []) {
        const withdrawFee = parseQuantity(network.withdrawalTxFee);
        if (withdrawFee === null) {
          continue;
        }

        const networkName = network.fullName || network.name;
        options[buildNetworkKey(asset, networkName)] = {
          withdrawFee,
          minimumWithdraw: parseQuantity(network.withdrawalMinAmount),
          isWithdrawAvailable: parseWithdrawalAvailability(network.withdrawalStatus),
          suspensionMessage: null,
        };
      }
    }

    if (!options[buildNetworkKey("BTC", "Bitcoin")]) {
      console.warn("[korbit] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return buildFallbackResult();
    }

    return {
      meta: { ...EXCHANGE_META.korbit, source: "live" },
      options,
      usdtKrwPrice: null,
    };
  } catch (error) {
    console.warn("[korbit] 출금 정보 조회 중 예외:", error);
    return buildFallbackResult();
  }
}
// endregion
