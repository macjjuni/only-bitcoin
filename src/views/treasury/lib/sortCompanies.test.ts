import { describe, expect, it } from "vitest";
import type { CompanyTreasuryHolding } from "@/entities/treasury";
import { filterCompaniesByKeyword, sortCompaniesBySortKey } from "./sortCompanies";

const createCompany = (
  overrides: Partial<CompanyTreasuryHolding> & Pick<CompanyTreasuryHolding, "companyName">,
): CompanyTreasuryHolding => ({
  tickerSymbol: "NASDAQ:TEST",
  countryCode: "US",
  totalHoldingsInBtc: 0,
  totalEntryValueInUsd: 0,
  totalCurrentValueInUsd: 0,
  percentageOfTotalSupply: 0,
  averageEntryPriceInUsd: 0,
  unrealizedProfitInUsd: 0,
  unrealizedProfitRatePercent: 0,
  ...overrides,
});

describe("sortCompaniesBySortKey", () => {
  const companies = [
    createCompany({
      companyName: "Small Holder",
      totalHoldingsInBtc: 100,
      unrealizedProfitRatePercent: 300,
      percentageOfTotalSupply: 0.0005,
    }),
    createCompany({
      companyName: "Big Holder",
      totalHoldingsInBtc: 600_000,
      unrealizedProfitRatePercent: 50,
      percentageOfTotalSupply: 2.9,
    }),
  ];

  it("보유량 기준 내림차순으로 정렬한다", () => {
    const sorted = sortCompaniesBySortKey(companies, "holdings");

    expect(sorted.map((company) => company.companyName)).toEqual(["Big Holder", "Small Holder"]);
  });

  it("수익률 기준 내림차순으로 정렬한다", () => {
    const sorted = sortCompaniesBySortKey(companies, "profitRate");

    expect(sorted.map((company) => company.companyName)).toEqual(["Small Holder", "Big Holder"]);
  });

  it("정렬 값이 같으면 보유량이 많은 기업을 앞에 둔다", () => {
    const noEntryDataCompanies = [
      createCompany({ companyName: "Tiny", totalHoldingsInBtc: 10 }),
      createCompany({ companyName: "Huge", totalHoldingsInBtc: 10_000 }),
    ];
    const sorted = sortCompaniesBySortKey(noEntryDataCompanies, "profitRate");

    expect(sorted.map((company) => company.companyName)).toEqual(["Huge", "Tiny"]);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const originalOrder = companies.map((company) => company.companyName);
    sortCompaniesBySortKey(companies, "holdings");

    expect(companies.map((company) => company.companyName)).toEqual(originalOrder);
  });
});

describe("filterCompaniesByKeyword", () => {
  const companies = [
    createCompany({ companyName: "Strategy", tickerSymbol: "NASDAQ:MSTR", countryCode: "US" }),
    createCompany({ companyName: "Metaplanet Inc.", tickerSymbol: "TSE:3350", countryCode: "JP" }),
  ];

  it("빈 검색어는 전체를 그대로 돌려준다", () => {
    expect(filterCompaniesByKeyword(companies, "   ")).toHaveLength(2);
  });

  it("기업명·티커·국가 코드를 대소문자 구분 없이 검색한다", () => {
    expect(filterCompaniesByKeyword(companies, "meta")[0]?.companyName).toBe("Metaplanet Inc.");
    expect(filterCompaniesByKeyword(companies, "mstr")[0]?.companyName).toBe("Strategy");
    expect(filterCompaniesByKeyword(companies, "jp")[0]?.companyName).toBe("Metaplanet Inc.");
  });

  it("일치하는 기업이 없으면 빈 배열을 돌려준다", () => {
    expect(filterCompaniesByKeyword(companies, "없는기업")).toEqual([]);
  });
});
