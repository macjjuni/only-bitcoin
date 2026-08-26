"use client";

import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useBlockStore } from "@/entities/block";
import type { ExchangeMeta, WithdrawNetworkRow } from "@/entities/exchange";
import {
  buildComparisonRows,
  buildOnChainFeeReference,
  findWorstBitcoinCell,
} from "../lib/calculateWithdrawFee";
import ExchangeFeeTable from "./ExchangeFeeTable";
import WithdrawFeeSummaryCard from "./WithdrawFeeSummaryCard";

interface WithdrawFeePanelProps {
  exchanges: ExchangeMeta[];
  /** 거래소 출금 조건. 시세와 달리 실시간으로 안 바뀌므로 서버 값을 그대로 씀. */
  rows: WithdrawNetworkRow[];
  usdtKrwPrice: number;
  fetchedAt: string;
  verifiedAt: string;
  /** SSR 초기값. 소켓이 값을 채우기 전까지 이걸 씀. */
  initialFeeRate: number;
  initialBtcKrwPrice: number;
}

/**
 * 원화 환산과 배율을 클라이언트에서 다시 계산함.
 *
 * 멤풀 소켓과 시세 소켓(`Initializer` 에서 전역 연결)이 스토어를 계속 갱신하므로,
 * 서버 렌더 값만 쓰면 화면을 켜둔 동안 숫자가 굳어 버림. 거래소 수수료는 고정이고
 * **온체인 실비와 시세만 움직이므로** 그 둘만 스토어에서 읽어 다시 계산함.
 */
export default function WithdrawFeePanel({
  exchanges,
  rows,
  usdtKrwPrice,
  fetchedAt,
  verifiedAt,
  initialFeeRate,
  initialBtcKrwPrice,
}: WithdrawFeePanelProps) {
  // region [Hooks]
  const storeFees = useBlockStore((state) => state.fees);
  const socketKrw = useBitcoinStore((state) => state.bitcoinPrice.krw);
  // endregion

  // region [Privates]
  // 스토어 초기값이 0 이라 소켓이 채우기 전에는 SSR 값이 그대로 쓰임. ( 하이드레이션 불일치 없음 )
  const feeRate = storeFees.halfHourFee || initialFeeRate;
  const btcKrwPrice = socketKrw || initialBtcKrwPrice;

  const onChain = useMemo(
    () => buildOnChainFeeReference(feeRate, btcKrwPrice),
    [feeRate, btcKrwPrice],
  );

  const comparisonRows = useMemo(
    () => buildComparisonRows({ rows, onChain, btcKrwPrice, usdtKrwPrice }),
    [rows, onChain, btcKrwPrice, usdtKrwPrice],
  );

  const worst = useMemo(() => findWorstBitcoinCell(comparisonRows), [comparisonRows]);

  /** 거래소들의 BTC 수수료가 같으면 한 곳을 지목하는 게 자의적이라 총칭으로 부름. */
  const subjectLabel = useMemo(() => {
    const bitcoinRow = comparisonRows.find(
      (row) => row.asset === "BTC" && row.networkName === "Bitcoin",
    );
    const cells = Object.values(bitcoinRow?.cells ?? {});
    const isEveryFeeSame = cells.every(
      (cell) => cell.withdrawFeeInAsset === cells[0]?.withdrawFeeInAsset,
    );
    if (isEveryFeeSame) return "국내 거래소";

    return exchanges.find((exchange) => exchange.id === worst?.[0])?.name ?? "거래소";
  }, [comparisonRows, exchanges, worst]);
  // endregion

  return (
    <>
      {worst && (
        <WithdrawFeeSummaryCard onChain={onChain} worst={worst[1]} subjectLabel={subjectLabel} />
      )}
      <ExchangeFeeTable
        exchanges={exchanges}
        rows={comparisonRows}
        fetchedAt={fetchedAt}
        verifiedAt={verifiedAt}
      />
    </>
  );
}
