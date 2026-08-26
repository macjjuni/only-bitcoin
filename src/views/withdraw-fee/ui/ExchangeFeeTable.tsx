"use client";

import { useMemo, useState } from "react";
import type { ExchangeMeta, WithdrawAsset } from "@/entities/exchange";
import { Card, CardContent, SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import { comma } from "@/shared/utils/string";
import type { WithdrawCell, WithdrawComparisonRow } from "../lib/calculateWithdrawFee";

interface ExchangeFeeTableProps {
  exchanges: ExchangeMeta[];
  rows: WithdrawComparisonRow[];
  fetchedAt: string;
  verifiedAt: string;
}

interface NetworkTabProps {
  isSelected: boolean;
  networkName: string;
  onSelectNetwork: (networkName: string) => void;
}

interface ExchangeFeeRowProps {
  asset: WithdrawAsset;
  cell?: WithdrawCell;
  exchange: ExchangeMeta;
}

interface NetworkFeeCardProps {
  exchanges: ExchangeMeta[];
  row: WithdrawComparisonRow;
}

const ASSET_OPTIONS: Array<SegmentedControlOption<WithdrawAsset>> = [
  { label: "BTC", value: "BTC", activeClassName: "bg-bitcoin text-white shadow-sm" },
  { label: "USDT", value: "USDT" },
];

// region [Privates]
const formatKst = (isoTimestamp: string) =>
  new Date(isoTimestamp).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatAssetQuantity = (quantity: number, asset: WithdrawAsset) =>
  `${quantity.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${asset}`;

/** 수수료 0은 값이 빠진 것처럼 보이지 않도록 `무료`로 표시한다. */
const formatWithdrawFee = (cell: WithdrawCell, asset: WithdrawAsset) =>
  cell.withdrawFeeInAsset === 0 ? "무료" : formatAssetQuantity(cell.withdrawFeeInAsset, asset);

const formatMinimumWithdraw = (cell: WithdrawCell, asset: WithdrawAsset) => {
  if (cell.minimumWithdraw === null) {
    return "정보 없음";
  }

  return formatAssetQuantity(cell.minimumWithdraw, asset);
};

const resolveWithdrawFeeClassName = (cell: WithdrawCell) =>
  cell.withdrawFeeInAsset === 0 ? "text-up" : "text-bitcoin";
// endregion

// region [Templates]
function NetworkTab({ isSelected, networkName, onSelectNetwork }: NetworkTabProps) {
  const onClickNetworkTab = () => {
    onSelectNetwork(networkName);
  };

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
        isSelected
          ? "border-bitcoin bg-bitcoin/10 text-bitcoin"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      ].join(" ")}
      onClick={onClickNetworkTab}
    >
      {networkName}
    </button>
  );
}
// endregion

// region [Templates]
function ExchangeFeeRow({ asset, cell, exchange }: ExchangeFeeRowProps) {
  const isFallbackValue = exchange.source === "fallback";
  const isWithdrawUnavailable = cell?.isWithdrawAvailable === false;

  if (!cell) {
    return (
      <div className="grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-3">
        <strong className="text-xs font-bold">{exchange.name}</strong>
        <span className="col-span-2 text-right text-xs font-medium text-muted-foreground">
          미지원
        </span>
      </div>
    );
  }

  const withdrawFeeLabel = formatWithdrawFee(cell, asset);
  const minimumWithdrawLabel = formatMinimumWithdraw(cell, asset);
  const withdrawFeeClassName = resolveWithdrawFeeClassName(cell);
  // 수수료가 0 이거나 시세가 아직 안 붙은 경우는 원화 줄을 빌 것.
  const withdrawFeeInKrwLabel =
    cell.withdrawFeeInAsset === 0 || cell.withdrawFeeInKrw === null
      ? null
      : `≈ ${comma(Math.round(cell.withdrawFeeInKrw))}원`;

  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-2.5">
      <div className="flex min-w-0 flex-col items-start gap-0.5">
        <strong className="text-xs font-bold">{exchange.name}</strong>
        {isFallbackValue && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            저장값
          </span>
        )}
        {isWithdrawUnavailable && (
          <span className="rounded-full bg-down/10 px-1.5 py-0.5 text-[9px] font-bold text-down">
            출금 중단
          </span>
        )}
      </div>

      <div className="min-w-0 text-right">
        <span className={`font-number block truncate text-xs font-black ${withdrawFeeClassName}`}>
          {withdrawFeeLabel}
        </span>
        {withdrawFeeInKrwLabel && (
          <span className="font-number mt-0.5 block text-[9px] text-muted-foreground">
            {withdrawFeeInKrwLabel}
          </span>
        )}
      </div>

      <span className="font-number min-w-0 truncate text-right text-xs font-black text-foreground">
        {minimumWithdrawLabel}
      </span>
    </div>
  );
}

function NetworkFeeCard({ exchanges, row }: NetworkFeeCardProps) {
  const supportedExchangeCount = Object.keys(row.cells).length;
  const supportedExchangeLabel = `${supportedExchangeCount}/${exchanges.length} 지원`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background/60">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/25 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-bitcoin/10 px-2 py-1 text-xs font-black text-bitcoin">
            {row.asset}
          </span>
          <h3 className="truncate text-sm font-bold">{row.networkName}</h3>
        </div>
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
          {supportedExchangeLabel}
        </span>
      </header>

      <div className="grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/70 bg-muted/15 px-3 py-1.5 text-[9px] font-bold text-muted-foreground">
        <span>거래소</span>
        <span className="text-right">출금 수수료</span>
        <span className="text-right">최소 출금</span>
      </div>

      <div className="divide-y divide-border/70">
        {exchanges.map((exchange) => (
          <ExchangeFeeRow
            key={exchange.id}
            asset={row.asset}
            cell={row.cells[exchange.id]}
            exchange={exchange}
          />
        ))}
      </div>
    </section>
  );
}
// endregion

/**
 * 선택한 자산·네트워크 한 개의 출금 조건만 압축해서 비교한다.
 *
 * 기본값은 이 페이지의 핵심인 BTC 온체인이며, 다른 자산과 네트워크는 탭으로 전환한다.
 * 거래소가 추가되어도 가로 열과 전체 세로 길이가 늘어나지 않는다.
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
    <Card className="w-full">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-md font-bold">거래소별 출금 조건표</h2>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
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
          <span>실제 출금 전에는 거래소 안내를 직접 확인하세요.</span>
          <span className="mt-1 border-t border-border pt-2 text-right font-semibold text-foreground">
            업데이트 · {formatKst(fetchedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
