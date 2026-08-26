import { unstable_cache } from "next/cache";
import { buildNetworkKey, EXCHANGE_META } from "../model/fallback";
import type { ExchangeWithdrawOption, WithdrawAsset } from "../model/types";
import {
  buildExchangeFallbackResult,
  type ExchangeFetchResult,
  parseQuantity,
  TARGET_ASSETS,
  WITHDRAW_REVALIDATE_SECONDS,
} from "./shared";

// region [Types]
interface BinanceNetworkInfo {
  network: string;
  withdrawFee: string | null;
  withdrawMin: string | null;
  withdrawEnable: boolean;
  busy: boolean;
  withdrawDesc?: string;
  specialWithdrawTips?: string;
}

interface BinanceCoinInfo {
  coin: string;
  networkList?: BinanceNetworkInfo[];
}

interface BinanceNetworkCoinResponse {
  code: string;
  success: boolean;
  data?: BinanceCoinInfo[];
}
// endregion

// region [Privates]
/** 바이낸스 웹이 사용하는 공개 엔드포인트. 인증은 없지만 문서화된 공식 API는 아니다. */
const BINANCE_NETWORK_COIN_URL =
  "https://www.binance.com/bapi/capital/v1/public/capital/getNetworkCoinAll";

/**
 * 국내 거래소가 지원하는 비교망만 바이낸스 표기에 맞춰 연결한다.
 * 바이낸스에만 있는 USDT 망을 추가하면 선택지가 과도하게 늘어나므로 여기에 포함하지 않는다.
 */
const COMPARABLE_NETWORK_NAME_BY_ASSET: Record<WithdrawAsset, Readonly<Record<string, string>>> = {
  BTC: {
    BTC: "Bitcoin",
    LIGHTNING: "Lightning",
  },
  USDT: {
    TRX: "Tron",
    ETH: "Ethereum",
    KAIA: "Kaia",
    APT: "Aptos",
  },
};

const buildFallbackResult = () => buildExchangeFallbackResult("binance");

const resolveSuspensionMessage = (network: BinanceNetworkInfo): string | null =>
  network.withdrawDesc || network.specialWithdrawTips || null;
// endregion

// region [Transactions]
/**
 * 바이낸스의 BTC와 국내 거래소 비교 대상 USDT 망의 출금 조건을 조회한다.
 *
 * 공개 웹 엔드포인트가 변경되거나 응답 검증에 실패하면 마지막 확인값을 반환한다.
 */
async function fetchBinanceWithdrawInfoFromSource(): Promise<ExchangeFetchResult> {
  try {
    const response = await fetch(BINANCE_NETWORK_COIN_URL, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[binance] 출금 정보 조회 실패: HTTP ${response.status}`);
      return buildFallbackResult();
    }

    const body = (await response.json()) as BinanceNetworkCoinResponse;
    if (body.success !== true || body.code !== "000000" || !Array.isArray(body.data)) {
      console.warn("[binance] 가상자산 정보 응답 형식이 올바르지 않음");
      return buildFallbackResult();
    }

    const options: Record<string, ExchangeWithdrawOption> = {};

    for (const asset of TARGET_ASSETS) {
      const coin = body.data.find((item) => item.coin === asset);
      if (!coin) {
        continue;
      }

      const comparableNetworkNames = COMPARABLE_NETWORK_NAME_BY_ASSET[asset];

      for (const network of coin.networkList ?? []) {
        const networkName = comparableNetworkNames[network.network];
        if (!networkName) {
          continue;
        }

        const withdrawFee = parseQuantity(network.withdrawFee);
        if (withdrawFee === null) {
          continue;
        }

        options[buildNetworkKey(asset, networkName)] = {
          withdrawFee,
          minimumWithdraw: parseQuantity(network.withdrawMin),
          isWithdrawAvailable: network.withdrawEnable && !network.busy,
          suspensionMessage: resolveSuspensionMessage(network),
        };
      }
    }

    if (!options[buildNetworkKey("BTC", "Bitcoin")]) {
      console.warn("[binance] 응답에서 BTC 온체인 출금 수수료를 찾지 못함");
      return buildFallbackResult();
    }

    return {
      meta: { ...EXCHANGE_META.binance, source: "live" },
      options,
    };
  } catch (error) {
    console.warn("[binance] 출금 정보 조회 중 예외:", error);
    return buildFallbackResult();
  }
}

/** 원본 응답은 2MB를 넘을 수 있어 필요한 망만 추린 결과만 캐시한다. */
export const fetchBinanceWithdrawInfo = unstable_cache(
  fetchBinanceWithdrawInfoFromSource,
  ["binance-withdraw-info"],
  { revalidate: WITHDRAW_REVALIDATE_SECONDS },
);
// endregion
