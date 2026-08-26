import { buildNetworkKey, USDT_KRW_FALLBACK_PRICE } from "../model/fallback";
import type {
  ExchangeId,
  ExchangeWithdrawSnapshot,
  WithdrawAsset,
  WithdrawNetworkRow,
} from "../model/types";
import { fetchBithumbWithdrawInfo } from "./bithumbWithdraw.server";
import { type ExchangeFetchResult, TARGET_ASSETS } from "./shared";
import { fetchUpbitWithdrawInfo } from "./upbitWithdraw.server";

/** `자산:망` 키를 되돌림. 망 이름에 `:` 가 없다는 전제. */
const parseNetworkKey = (key: string) => {
  const separatorIndex = key.indexOf(":");

  return {
    asset: key.slice(0, separatorIndex) as WithdrawAsset,
    networkName: key.slice(separatorIndex + 1),
  };
};

/**
 * 거래소들이 지원하는 망을 합쳐 표의 행을 만듦.
 *
 * 한쪽만 지원하는 망도 행으로 남김. 그 칸은 화면에서 "미지원" 으로 표시해야
 * "이 거래소는 이 망이 없다" 는 정보가 전달됨. 조용히 빼면 그게 안 보임.
 */
const buildRows = (results: ExchangeFetchResult[]): WithdrawNetworkRow[] => {
  const keys = new Set<string>();
  for (const result of results) {
    for (const key of Object.keys(result.options)) keys.add(key);
  }

  const rows: WithdrawNetworkRow[] = [];

  for (const key of keys) {
    const { asset, networkName } = parseNetworkKey(key);
    const options: WithdrawNetworkRow["options"] = {};

    for (const result of results) {
      const option = result.options[key];
      if (option) options[result.meta.id as ExchangeId] = option;
    }

    rows.push({ asset, networkName, options });
  }

  /** 자산은 지정 순서(BTC 먼저), 같은 자산 안에서는 수수료가 싼 망부터. */
  const cheapestFee = (row: WithdrawNetworkRow) =>
    Math.min(...Object.values(row.options).map((option) => option.withdrawFee));

  return rows.sort((a, b) => {
    const assetOrder = TARGET_ASSETS.indexOf(a.asset) - TARGET_ASSETS.indexOf(b.asset);
    if (assetOrder !== 0) return assetOrder;

    return cheapestFee(a) - cheapestFee(b);
  });
};

/**
 * 거래소별 출금 조건을 모아 표 형태로 돌려줌.
 *
 * 각 페처가 실패를 폴백으로 흡수하므로 여기서는 예외가 안 남.
 * 캐시 주기는 거래소마다 다름. ( 빗썸 10분 / 업비트 24시간 — 각 모듈 주석 참고 )
 */
export async function fetchExchangeWithdrawSnapshot(): Promise<ExchangeWithdrawSnapshot> {
  const results = await Promise.all([fetchUpbitWithdrawInfo(), fetchBithumbWithdrawInfo()]);

  // 빗썸 응답이 코인별 KRW 시세를 같이 줌. 못 구하면 스테이블코인이라 폴백 값으로 대략 환산.
  const usdtKrwPrice =
    results.find((result) => result.usdtKrwPrice !== null)?.usdtKrwPrice ?? USDT_KRW_FALLBACK_PRICE;

  return {
    exchanges: results.map((result) => result.meta),
    rows: buildRows(results),
    usdtKrwPrice,
    fetchedAt: new Date().toISOString(),
    hasAnyFallback: results.some((result) => result.meta.source === "fallback"),
  };
}

export { buildNetworkKey };
