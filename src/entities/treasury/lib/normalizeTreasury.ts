import type {
  CompanyTreasuryHolding,
  PublicTreasuryCompanyResponse,
  PublicTreasuryResponse,
  PublicTreasurySummary,
} from "../model/types";

/**
 * 숫자가 아닌 값(null/undefined/문자열)을 0 으로 흡수한다.
 * CoinGecko 는 매입 데이터가 없는 기업의 금액 필드를 종종 null 로 내려준다.
 */
const toFiniteNumber = (value: unknown): number => {
  const parsedNumber = Number(value);

  return Number.isFinite(parsedNumber) ? parsedNumber : 0;
};

/** 매입 총액 ÷ 보유 수량. 보유 수량이 0 이면 나눗셈이 무한대가 되므로 0 으로 막는다. */
export function calculateAverageEntryPriceInUsd(
  totalEntryValueInUsd: number,
  totalHoldingsInBtc: number,
): number {
  if (totalHoldingsInBtc <= 0) {
    return 0;
  }

  return totalEntryValueInUsd / totalHoldingsInBtc;
}

/** 평가손익률(%). 매입 금액을 모르면 수익률을 정의할 수 없으므로 0 을 돌려준다. */
export function calculateUnrealizedProfitRatePercent(
  totalEntryValueInUsd: number,
  totalCurrentValueInUsd: number,
): number {
  if (totalEntryValueInUsd <= 0) {
    return 0;
  }

  return ((totalCurrentValueInUsd - totalEntryValueInUsd) / totalEntryValueInUsd) * 100;
}

/** 응답 1건을 화면용 모델로 정규화하고 파생 지표를 채운다. */
export function normalizeCompanyTreasuryHolding(
  company: PublicTreasuryCompanyResponse,
): CompanyTreasuryHolding {
  const totalHoldingsInBtc = toFiniteNumber(company.total_holdings);
  const totalEntryValueInUsd = toFiniteNumber(company.total_entry_value_usd);
  const totalCurrentValueInUsd = toFiniteNumber(company.total_current_value_usd);

  return {
    tickerSymbol: company.symbol ?? "",
    companyName: company.name ?? "",
    countryCode: company.country ?? "",
    totalHoldingsInBtc,
    totalEntryValueInUsd,
    totalCurrentValueInUsd,
    percentageOfTotalSupply: toFiniteNumber(company.percentage_of_total_supply),
    averageEntryPriceInUsd: calculateAverageEntryPriceInUsd(
      totalEntryValueInUsd,
      totalHoldingsInBtc,
    ),
    unrealizedProfitInUsd: totalCurrentValueInUsd - totalEntryValueInUsd,
    unrealizedProfitRatePercent: calculateUnrealizedProfitRatePercent(
      totalEntryValueInUsd,
      totalCurrentValueInUsd,
    ),
  };
}

/**
 * 전체 합산 지표를 만든다.
 *
 * 보유량·평가액·도미넌스는 응답의 top-level 값을 그대로 쓰고, 매입 총액은 top-level 에
 * 없으므로 기업별 값을 합산해 계산한다. 매입 데이터가 없는 기업은 0 으로 합산되므로
 * 전체 수익률은 "매입 정보가 공개된 기업 기준" 근사치다.
 */
export function buildPublicTreasurySummary(
  response: PublicTreasuryResponse,
  companies: CompanyTreasuryHolding[],
): PublicTreasurySummary {
  const totalValueInUsd = toFiniteNumber(response.total_value_usd);
  const totalEntryValueInUsd = companies.reduce((accumulatedValue, company) => {
    return accumulatedValue + company.totalEntryValueInUsd;
  }, 0);

  return {
    totalHoldingsInBtc: toFiniteNumber(response.total_holdings),
    totalValueInUsd,
    marketCapDominancePercent: toFiniteNumber(response.market_cap_dominance),
    totalEntryValueInUsd,
    unrealizedProfitInUsd: totalValueInUsd - totalEntryValueInUsd,
    unrealizedProfitRatePercent: calculateUnrealizedProfitRatePercent(
      totalEntryValueInUsd,
      totalValueInUsd,
    ),
    companyCount: companies.length,
  };
}
