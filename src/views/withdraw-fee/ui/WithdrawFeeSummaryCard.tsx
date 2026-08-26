import { comma } from "@/shared/utils/string";
import type { OnChainFeeReference, WithdrawCell } from "../lib/calculateWithdrawFee";
import { REFERENCE_TX_VBYTES } from "../lib/calculateWithdrawFee";

interface WithdrawFeeSummaryCardProps {
  onChain: OnChainFeeReference;
  /** 수수료가 가장 비싼 거래소. 대표 숫자로 씀. */
  worst: WithdrawCell;
  /**
   * 대표 숫자의 주체 표기.
   *
   * 거래소들의 수수료가 같으면 그중 하나를 "가장 비싼 곳" 으로 지목하는 게 자의적이라
   * 페이지에서 "국내 거래소" 같은 총칭을 넘겨줌.
   */
  subjectLabel: string;
}

/**
 * 이 화면의 결론을 한 장으로 보여줌.
 *
 * 원화 금액을 크게, 배율을 부제로 둠. 금액만 있으면 "그 정도면 낼 만하지" 로 끝나고
 * 배율만 있으면 체감이 안 와서 둘을 같이 보여줌.
 */
export default function WithdrawFeeSummaryCard({
  onChain,
  worst,
  subjectLabel,
}: WithdrawFeeSummaryCardProps) {
  return (
    <section className="-mx-2 select-none">
      <div className="flex flex-col px-5 pb-5 pt-1">
        {/* 비트코인이 계산 단위인 사이트라 히어로는 sats. 원화는 아래에 보조로 둠. */}
        <strong className="font-number mb-1 block text-[clamp(2rem,10vw,3.25rem)] font-black leading-none tracking-tight">
          {comma(worst.withdrawFeeInSats ?? 0)}
          <span className="ml-2 text-[24px] font-black text-bitcoin">sats</span>
        </strong>

        <p className="font-number mb-1.5 text-sm font-bold text-muted-foreground">
          {worst.withdrawFeeInAsset} BTC · 약 {comma(Math.round(worst.withdrawFeeInKrw))}원
        </p>

        <p className="mb-4 text-sm font-bold text-muted-foreground">
          {subjectLabel}에서 비트코인 한 번 출금할 때 떼는 금액
        </p>

        <div className="flex flex-col gap-1 rounded-lg bg-bitcoin/10 px-3 py-2.5">
          <strong className="text-sm font-bold text-bitcoin">
            같은 송금의 실제 네트워크 비용은 {comma(onChain.feeInSats)} sats ≈{" "}
            {comma(Math.round(onChain.feeInKrw))}원
          </strong>
          {worst.multipleOfOnChainFee !== null && (
            <p className="text-sm leading-relaxed text-foreground">
              거래소가 <b>{worst.multipleOfOnChainFee.toFixed(1)}배</b> 를 받고 있습니다. 출금
              수수료는 네트워크가 정하는 값이 아니라 거래소가 정하는 값입니다.
            </p>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          네트워크 비용은 현재 {onChain.feeRate} sat/vB 기준, 입력 1개·출력 2개짜리 SegWit 송금(약{" "}
          {REFERENCE_TX_VBYTES} vB)으로 계산했습니다. 거래소는 여러 출금을 묶어 보내므로 실제
          부담하는 비용은 이보다 적을 수 있습니다.
        </p>
      </div>
    </section>
  );
}
