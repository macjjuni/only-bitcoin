"use client";

import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import type { ExchangeMeta, WithdrawNetworkRow } from "@/entities/exchange";
import { buildComparisonRows } from "../lib/calculateWithdrawFee";
import { ExchangeFeeTable } from "./ExchangeFeeTable";

interface WithdrawFeePanelProps {
  exchanges: ExchangeMeta[];
  /** 거래소 출금 조건. 시세와 달리 실시간으로 안 바뀌므로 서버 값을 그대로 씀. */
  rows: WithdrawNetworkRow[];
  fetchedAt: string;
  verifiedAt: string;
}

/**
 * 원화 환산을 클라이언트에서 계산함.
 *
 * BTC·USDT 시세 모두 전역 스토어(`Initializer` 에서 세팅) 값을 씀.
 * 스토어 초기값이 0 이라 시세가 들어오기 전에는 원화 줄을 아예 안 그림.
 */
export function WithdrawFeePanel({
  exchanges,
  rows,
  fetchedAt,
  verifiedAt,
}: WithdrawFeePanelProps) {
  // region [Hooks]
  // 스토어 초기값이 0 이라 서버·클라이언트 첫 렌더가 같음. ( 하이드레이션 불일치 없음 )
  const btcKrwPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const usdtKrwPrice = useBitcoinStore((state) => state.exRate.value);

  const comparisonRows = useMemo(
    () => buildComparisonRows({ rows, btcKrwPrice, usdtKrwPrice }),
    [rows, btcKrwPrice, usdtKrwPrice],
  );
  // endregion

  return (
    <ExchangeFeeTable
      exchanges={exchanges}
      rows={comparisonRows}
      fetchedAt={fetchedAt}
      verifiedAt={verifiedAt}
    />
  );
}
