"use client";

import { Search } from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";
import type { CompanyTreasuryHolding } from "@/entities/treasury";
import {
  Card,
  CardContent,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  SegmentedControl,
} from "@/shared/ui";
import {
  filterCompaniesByKeyword,
  sortCompaniesBySortKey,
  type TreasurySortKey,
} from "../lib/sortCompanies";
import {
  INITIAL_VISIBLE_COMPANY_COUNT,
  LOAD_MORE_COMPANY_COUNT,
  TREASURY_SORT_OPTIONS,
} from "../model/constants";
import TreasuryCompanyRow from "./TreasuryCompanyRow";

const DEFAULT_SORT_KEY: TreasurySortKey = "holdings";

interface TreasuryCompanyListCardProps {
  companies: CompanyTreasuryHolding[];
}

export default function TreasuryCompanyListCard({ companies }: TreasuryCompanyListCardProps) {
  // region [Hooks]
  const [sortKey, setSortKey] = useState<TreasurySortKey>(DEFAULT_SORT_KEY);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [visibleCompanyCount, setVisibleCompanyCount] = useState(INITIAL_VISIBLE_COMPANY_COUNT);
  // endregion

  // region [Privates]
  const filteredCompanies = useMemo(() => {
    return sortCompaniesBySortKey(filterCompaniesByKeyword(companies, searchKeyword), sortKey);
  }, [companies, searchKeyword, sortKey]);

  const visibleCompanies = useMemo(() => {
    return filteredCompanies.slice(0, visibleCompanyCount);
  }, [filteredCompanies, visibleCompanyCount]);

  /** 정렬·검색이 바뀌면 위에서부터 다시 보여줘야 순위가 어긋나지 않는다. */
  const resetVisibleCompanyCount = () => {
    setVisibleCompanyCount(INITIAL_VISIBLE_COMPANY_COUNT);
  };
  // endregion

  // region [Events]
  const onChangeSortKey = (nextSortKey: TreasurySortKey) => {
    setSortKey(nextSortKey);
    resetVisibleCompanyCount();
  };

  const onChangeSearchKeywordInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
    resetVisibleCompanyCount();
  };

  const onClickLoadMoreButton = () => {
    setVisibleCompanyCount((previousCount) => previousCount + LOAD_MORE_COMPANY_COUNT);
  };
  // endregion

  // region [Templates]
  const hasMoreCompanies = visibleCompanyCount < filteredCompanies.length;
  const hasNoSearchResult = filteredCompanies.length === 0;

  const CompanyListTemplate = useMemo(() => {
    if (hasNoSearchResult) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          검색 결과가 없어요. 기업명이나 티커로 다시 찾아보세요.
        </p>
      );
    }

    return (
      <ul className="flex flex-col">
        {visibleCompanies.map((company, companyIndex) => (
          <TreasuryCompanyRow
            key={company.tickerSymbol || company.companyName}
            company={company}
            rank={companyIndex + 1}
          />
        ))}
      </ul>
    );
  }, [hasNoSearchResult, visibleCompanies]);
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold">기업별 보유 현황</h2>
          <span className="font-number text-xs text-muted-foreground">
            {filteredCompanies.length.toLocaleString("ko-KR")}곳
          </span>
        </div>

        <SegmentedControl
          size="sm"
          options={TREASURY_SORT_OPTIONS}
          value={sortKey}
          onChange={onChangeSortKey}
        />

        <InputGroup size="sm" className="h-10">
          <InputGroupAddon align="inline-start" className="pr-0">
            <Search size={16} className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            maxLength={40}
            placeholder="기업명 또는 티커 검색"
            value={searchKeyword}
            onChange={onChangeSearchKeywordInput}
            className="h-full text-sm"
          />
        </InputGroup>

        {CompanyListTemplate}

        {hasMoreCompanies && (
          <button
            type="button"
            className="h-10 rounded-lg bg-neutral-200/70 text-sm font-bold text-foreground transition-colors active:scale-[0.97] dark:bg-neutral-800"
            onClick={onClickLoadMoreButton}
          >
            더 보기
          </button>
        )}
      </CardContent>
    </Card>
  );
}
