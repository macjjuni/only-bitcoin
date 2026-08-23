import type { CompanyTreasuryHolding } from "@/entities/treasury";

/** 목록 정렬 기준. */
export type TreasurySortKey = "holdings" | "profitRate" | "supplyShare";

const SORT_VALUE_SELECTORS: Record<TreasurySortKey, (company: CompanyTreasuryHolding) => number> = {
  holdings: (company) => company.totalHoldingsInBtc,
  profitRate: (company) => company.unrealizedProfitRatePercent,
  supplyShare: (company) => company.percentageOfTotalSupply,
};

/**
 * 선택한 기준으로 내림차순 정렬한다.
 *
 * 수익률 정렬에서 매입 데이터가 없는 기업(수익률 0)이 손실 기업보다 위로 올라오는 것을
 * 막기 위해, 값이 같으면 보유량이 많은 기업을 앞에 둔다.
 */
export function sortCompaniesBySortKey(
  companies: CompanyTreasuryHolding[],
  sortKey: TreasurySortKey,
): CompanyTreasuryHolding[] {
  const selectSortValue = SORT_VALUE_SELECTORS[sortKey];

  return [...companies].sort((a, b) => {
    const sortValueDifference = selectSortValue(b) - selectSortValue(a);

    if (sortValueDifference !== 0) {
      return sortValueDifference;
    }

    return b.totalHoldingsInBtc - a.totalHoldingsInBtc;
  });
}

/** 기업명·티커·국가 코드 중 하나라도 검색어를 포함하면 통과시킨다. */
export function filterCompaniesByKeyword(
  companies: CompanyTreasuryHolding[],
  searchKeyword: string,
): CompanyTreasuryHolding[] {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  if (normalizedKeyword === "") {
    return companies;
  }

  return companies.filter((company) => {
    const searchableText =
      `${company.companyName} ${company.tickerSymbol} ${company.countryCode}`.toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}
