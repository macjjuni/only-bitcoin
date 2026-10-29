import { createHash, createHmac } from "node:crypto";
import { unstable_cache } from "next/cache";
import { buildNetworkKey, EXCHANGE_META } from "../model/fallback";
import type { ExchangeWithdrawOption, WithdrawAsset } from "../model/types";
import {
  buildExchangeFallbackResult,
  type ExchangeFetchResult,
  isWithdrawAsset,
  parseQuantity,
  TARGET_ASSETS,
  WITHDRAW_REVALIDATE_SECONDS,
} from "./shared";

// region [Types]
interface KrakenFundingMethod {
  asset?: { name?: string };
  minimum_amount?: string;
  fees?: { base?: { amount?: string } };
  network?: { network_name?: string };
}

interface KrakenFundingMethodsResponse {
  methods?: KrakenFundingMethod[];
}
// endregion

// region [Privates]
const KRAKEN_API_ORIGIN = "https://api.kraken.com";
const KRAKEN_FUNDING_METHODS_PATH = "/funding/v1/methods/withdraw";

const buildFallbackResult = () => buildExchangeFallbackResult("kraken");

const resolveNetworkName = (asset: string, network: string): string | null => {
  if (asset === "BTC" && network.toLowerCase() === "bitcoin") return "Bitcoin";
  if (asset === "BTC" && network.toLowerCase() === "bitcoin lightning") return "Lightning";
  if (asset !== "USDT") return null;

  const normalizedNetwork = network.toLowerCase();
  if (normalizedNetwork === "tron") return "Tron";
  if (normalizedNetwork === "ethereum") return "Ethereum";
  return null;
};

const createApiSignature = (path: string, nonce: string, secret: string) => {
  const digest = createHash("sha256").update(nonce).digest();
  return createHmac("sha512", Buffer.from(secret, "base64"))
    .update(Buffer.concat([Buffer.from(path), digest]))
    .digest("base64");
};

export const parseKrakenWithdrawMethods = (
  methods: KrakenFundingMethod[],
): Record<string, ExchangeWithdrawOption> => {
  const options: Record<string, ExchangeWithdrawOption> = {};

  for (const method of methods) {
    const asset = method.asset?.name;
    const network = method.network?.network_name;
    if (!asset || !network || !isWithdrawAsset(asset)) continue;

    const networkName = resolveNetworkName(asset, network);
    const withdrawFee = parseQuantity(method.fees?.base?.amount);
    if (!networkName || withdrawFee === null) continue;

    options[buildNetworkKey(asset, networkName)] = {
      withdrawFee,
      minimumWithdraw: parseQuantity(method.minimum_amount),
      isWithdrawAvailable: true,
      suspensionMessage: null,
    };
  }

  return options;
};
// endregion

// region [Transactions]
/**
 * 자산 하나의 출금 방법만 조회함.
 *
 * 필터 없이 부르면 500개씩 페이지가 나뉘고 BTC·USDT 는 뒤쪽 페이지에 있어서 첫 페이지만으론 못 찾음.
 * `asset[class]` 와 `asset[name]` 을 같이 줘야 필터가 먹고, 서명에도 쿼리스트링을 포함해야 함.
 */
async function fetchKrakenAssetMethods(
  asset: WithdrawAsset,
  apiKey: string,
  apiSecret: string,
): Promise<KrakenFundingMethod[] | null> {
  const path = `${KRAKEN_FUNDING_METHODS_PATH}?asset[class]=currency&asset[name]=${asset}`;
  const nonce = Date.now().toString();
  const response = await fetch(`${KRAKEN_API_ORIGIN}${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "API-Key": apiKey,
      "API-Nonce": nonce,
      "API-Sign": createApiSignature(path, nonce, apiSecret),
    },
  });

  if (!response.ok) {
    console.warn(`[kraken] ${asset} 출금 방법 조회 실패: HTTP ${response.status}`);
    return null;
  }

  const body = (await response.json()) as KrakenFundingMethodsResponse;
  return body.methods ?? [];
}

async function fetchKrakenWithdrawInfoFromSource(): Promise<ExchangeFetchResult> {
  const apiKey = process.env.KRAKEN_API_KEY;
  const apiSecret = process.env.KRAKEN_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.warn("[kraken] KRAKEN_API_KEY 또는 KRAKEN_API_SECRET이 없어 fallback을 사용합니다.");
    return buildFallbackResult();
  }

  try {
    // nonce 는 증가해야 하므로 병렬로 쏘지 않고 순서대로 부름.
    const methods: KrakenFundingMethod[] = [];
    for (const asset of TARGET_ASSETS) {
      const assetMethods = await fetchKrakenAssetMethods(asset, apiKey, apiSecret);
      if (assetMethods === null) return buildFallbackResult();
      methods.push(...assetMethods);
    }

    const options = parseKrakenWithdrawMethods(methods);
    if (!options[buildNetworkKey("BTC", "Bitcoin")]) {
      console.warn("[kraken] 응답에서 BTC Bitcoin 출금 수수료를 찾지 못했습니다.");
      return buildFallbackResult();
    }

    return {
      meta: { ...EXCHANGE_META.kraken, source: "live" },
      options,
    };
  } catch (error) {
    console.warn("[kraken] 출금 방법 조회 중 예외:", error);
    return buildFallbackResult();
  }
}

export const fetchKrakenWithdrawInfo = unstable_cache(
  fetchKrakenWithdrawInfoFromSource,
  ["kraken-withdraw-info"],
  { revalidate: WITHDRAW_REVALIDATE_SECONDS },
);
// endregion
