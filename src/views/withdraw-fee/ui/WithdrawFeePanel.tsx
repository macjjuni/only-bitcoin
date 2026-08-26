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
  usdtKrwPrice: number;
  fetchedAt: string;
  verifiedAt: string;
}

/**
 * 원화 환산을 클라이언트에서 계산함.
 *
 * BTC 시세는 소켓(`Initializer` 에서 전역 연결) 값만 씀. SSR 초기값을 심으면 캐시된
 * 시세가 화면에 굳어 버려서, 소켓이 붙기 전에는 원화 줄을 아예 안 그림.
 * USDT 는 빗썸 응답에 실려 오는 서버 값이라 처음부터 환산됨.
 */
export function WithdrawFeePanel({
  exchanges,
  rows,
  usdtKrwPrice,
  fetchedAt,
  verifiedAt,
}: WithdrawFeePanelProps) {
  // region [Hooks]
  // 스토어 초기값이 0 이라 서버·클라이언트 첫 렌더가 같음. ( 하이드레이션 불일치 없음 )
  const btcKrwPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);

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
