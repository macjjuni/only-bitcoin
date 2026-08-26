"use client";

import { useMemo, useState } from "react";
import type { ExchangeMeta, WithdrawAsset } from "@/entities/exchange";
import { Card, CardContent, SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import type { WithdrawComparisonRow } from "../lib/calculateWithdrawFee";
import { ASSET_THEME } from "../model/exchangeFeeTheme";
import { NetworkFeeCard } from "./NetworkFeeCard";

interface ExchangeFeeTableProps {
  exchanges: ExchangeMeta[];
  rows: WithdrawComparisonRow[];
  fetchedAt: string;
  verifiedAt: string;
}

interface NetworkTabProps {
  asset: WithdrawAsset;
  isSelected: boolean;
  networkName: string;
  onSelectNetwork: (networkName: string) => void;
}

const ASSET_OPTIONS: Array<SegmentedControlOption<WithdrawAsset>> = [
  { label: "BTC", value: "BTC", activeClassName: "bg-bitcoin text-white shadow-sm" },
  { label: "USDT", value: "USDT", activeClassName: "bg-tether text-white shadow-sm" },
];

// region [Privates]
const formatKst = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });
// endregion

// region [Templates]
function NetworkTab({ asset, isSelected, networkName, onSelectNetwork }: NetworkTabProps) {
  const onClickNetworkTab = () => {
    onSelectNetwork(networkName);
  };

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={[
        "rounded-full border px-3 py-1.5 text-sm font-bold transition-colors",
        isSelected
          ? ASSET_THEME[asset].tab
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      ].join(" ")}
      onClick={onClickNetworkTab}
    >
      {networkName}
    </button>
  );
}
// endregion

/**
 * 선택한 자산·네트워크 한 개의 출금 조건만 압축해서 비교.
 *
 * 기본값은 이 페이지의 핵심인 BTC 온체인이며, 다른 자산과 네트워크는 탭으로 전환.
 * 거래소가 추가되어도 가로 열과 전체 세로 길이가 늘어나지 않음.
 */
export function ExchangeFeeTable({
  exchanges,
  rows,
  fetchedAt,
  verifiedAt,
}: ExchangeFeeTableProps) {
  // region [Hooks]
  const initialRow = rows[0];
  const [selectedAsset, setSelectedAsset] = useState<WithdrawAsset>(initialRow?.asset ?? "BTC");
  const [selectedNetworkName, setSelectedNetworkName] = useState(
    initialRow?.networkName ?? "Bitcoin",
  );

  const selectedAssetRows = useMemo(
    () => rows.filter((row) => row.asset === selectedAsset),
    [rows, selectedAsset],
  );

  const selectedRow = useMemo(
    () =>
      selectedAssetRows.find((row) => row.networkName === selectedNetworkName) ??
      selectedAssetRows[0],
    [selectedAssetRows, selectedNetworkName],
  );
  // endregion

  // region [Privates]
  const hasAnyFallback = exchanges.some((exchange) => exchange.source === "fallback");
  const exchangeCountLabel = `${exchanges.length}개 거래소`;
  const shouldShowNetworkTabs = selectedAssetRows.length > 1;
  // endregion

  // region [Events]
  const onSelectAsset = (asset: WithdrawAsset) => {
    const firstAssetRow = rows.find((row) => row.asset === asset);

    setSelectedAsset(asset);
    if (firstAssetRow) {
      setSelectedNetworkName(firstAssetRow.networkName);
    }
  };

  const onSelectNetwork = (networkName: string) => {
    setSelectedNetworkName(networkName);
  };
  // endregion

  // region [Templates]
  const NetworkTabsTemplate = shouldShowNetworkTabs
    ? selectedAssetRows.map((row) => (
        <NetworkTab
          key={row.networkName}
          asset={selectedAsset}
          isSelected={row.networkName === selectedRow?.networkName}
          networkName={row.networkName}
          onSelectNetwork={onSelectNetwork}
        />
      ))
    : null;

  const SelectedNetworkCardTemplate = selectedRow ? (
    <NetworkFeeCard exchanges={exchanges} row={selectedRow} />
  ) : null;
  // endregion

  return (
    <Card className="w-full font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-base font-bold">거래소별 출금 조건표</h2>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-sm font-bold text-muted-foreground">
            {exchangeCountLabel}
          </span>
        </div>

        <SegmentedControl options={ASSET_OPTIONS} value={selectedAsset} onChange={onSelectAsset} />

        {shouldShowNetworkTabs && (
          <div className="flex flex-wrap gap-1.5">{NetworkTabsTemplate}</div>
        )}

        {SelectedNetworkCardTemplate}

        <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          {hasAnyFallback && (
            <span className="text-down">
              일부 거래소는 조회에 실패해 {verifiedAt} 확인값을 표시합니다.
            </span>
          )}
          <div className="text-center pt-2 pb-3">
            실제 출금 전에는 거래소 안내를 직접 확인하세요.
          </div>
          <span className="mt-1 border-t border-border pt-2 text-right font-semibold text-foreground">
            업데이트 · {formatKst(fetchedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
