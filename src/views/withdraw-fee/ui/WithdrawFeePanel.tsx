"use client";

import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useBlockStore } from "@/entities/block";
import type { ExchangeWithdrawInfo } from "@/entities/exchange";
import { buildOnChainFeeReference, buildWithdrawFeeComparison } from "../lib/calculateWithdrawFee";
import ExchangeFeeList from "./ExchangeFeeList";
import WithdrawFeeSummaryCard from "./WithdrawFeeSummaryCard";

interface WithdrawFeePanelProps {
  /** 거래소 출금 정보. 시세와 달리 실시간으로 안 바뀌므로 서버 값을 그대로 씀. */
  exchanges: ExchangeWithdrawInfo[];
  fetchedAt: string;
  verifiedAt: string;
  /** SSR 초기값. 소켓이 값을 채우기 전까지 이걸 씀. */
  initialFeeRate: number;
  initialBtcKrwPrice: number;
}

/**
 * 배율 계산을 클라이언트에서 다시 함.
 *
 * 멤풀 소켓(`Initializer` 에서 전역 연결)과 시세 소켓이 스토어를 계속 갱신하므로,
 * 서버 렌더 값만 쓰면 화면을 켜둔 동안 숫자가 굳어 버림. 거래소 수수료는 고정이고
 * **온체인 실비와 시세만 움직이므로** 그 둘만 스토어에서 읽어 다시 계산함.
 */
export default function WithdrawFeePanel({
  exchanges,
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

  const comparisons = useMemo(
    () => exchanges.map((exchange) => buildWithdrawFeeComparison(exchange, onChain, btcKrwPrice)),
    [exchanges, onChain, btcKrwPrice],
  );

  // 정렬이 수수료 오름차순이라 마지막이 가장 비싼 곳.
  const worst = comparisons[comparisons.length - 1];

  // 다 같은 금액이면 특정 거래소를 지목하지 않고 총칭으로 부름.
  const subjectLabel = useMemo(() => {
    const isEveryFeeSame = comparisons.every(
      (item) => item.exchangeFeeInSats === comparisons[0]?.exchangeFeeInSats,
    );

    return isEveryFeeSame ? "국내 거래소" : (worst?.exchange.name ?? "거래소");
  }, [comparisons, worst]);
  // endregion

  return (
    <>
      {worst && (
        <WithdrawFeeSummaryCard onChain={onChain} worst={worst} subjectLabel={subjectLabel} />
      )}
      <ExchangeFeeList comparisons={comparisons} fetchedAt={fetchedAt} verifiedAt={verifiedAt} />
    </>
  );
}
