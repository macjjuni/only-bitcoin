"use client";

import { Search } from "lucide-react";
import { type ChangeEvent, useMemo, useState } from "react";
import { isBitcoinAsset, type RankedAsset } from "@/entities/asset-ranking";
import { Card, CardContent, InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui";
import AssetRankingRow from "./AssetRankingRow";

interface AssetRankingTableProps {
  assets: RankedAsset[];
}

export default function AssetRankingTable({ assets }: AssetRankingTableProps) {
  // region [Hooks]
  const [searchKeyword, setSearchKeyword] = useState("");
  const filteredAssets = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    return assets.filter((asset) => {
      const searchableName = isBitcoinAsset(asset) ? `${asset.name} 비트코인` : asset.name;
      return `${searchableName} ${asset.ticker}`.toLowerCase().includes(normalizedKeyword);
    });
  }, [assets, searchKeyword]);
  // endregion

  // region [Events]
  const onChangeSearchKeywordInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  };
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-0 pt-4">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-base font-bold">시가총액 순위</h2>
          <span className="font-number text-xs text-muted-foreground" aria-live="polite">
            {filteredAssets.length} / {assets.length}개 · USD
          </span>
        </div>
        <div className="px-4">
          <InputGroup size="sm" className="h-10">
            <InputGroupAddon align="inline-start" className="pr-0">
              <Search size={16} className="text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="자산명 또는 티커 검색"
              placeholder="자산명 또는 티커 검색"
              maxLength={80}
              value={searchKeyword}
              onChange={onChangeSearchKeywordInput}
              className="h-full text-sm"
            />
          </InputGroup>
        </div>
        <div className="overflow-hidden rounded-b-xl">
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">
              시가총액 상위 100개 자산. 검색해도 원본 순위가 유지됩니다.
            </caption>
            <thead>
              <tr className="border-b border-border bg-foreground/5 text-xs text-muted-foreground">
                <th scope="col" className="w-8 py-2 pl-3 text-left font-medium">
                  #
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  자산
                </th>
                <th
                  scope="col"
                  className="hidden w-[96px] px-2 py-2 text-right font-medium min-[480px]:table-cell"
                >
                  가격
                </th>
                <th scope="col" className="w-[104px] py-2 pl-2 pr-3 text-right font-medium">
                  시가총액
                  <span className="mt-0.5 block text-[11px]">당일 등락</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <AssetRankingRow key={`${asset.name}:${asset.ticker}`} asset={asset} />
              ))}
            </tbody>
          </table>
          {filteredAssets.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              검색 결과가 없어요. 자산명이나 티커로 다시 찾아보세요.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
