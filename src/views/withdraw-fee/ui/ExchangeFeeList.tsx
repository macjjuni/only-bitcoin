import { Card, CardContent } from "@/shared/ui";
import { comma } from "@/shared/utils/string";
import type { WithdrawFeeComparison } from "../lib/calculateWithdrawFee";

interface ExchangeFeeListProps {
  comparisons: WithdrawFeeComparison[];
  /** 스냅샷 조회 시각(ISO). */
  fetchedAt: string;
  /** 사람이 마지막으로 폴백 값을 확인한 날. */
  verifiedAt: string;
}

const formatKst = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

/** 거래소별 출금 조건. 수수료가 싼 순으로 이미 정렬돼 들어옴. */
export default function ExchangeFeeList({
  comparisons,
  fetchedAt,
  verifiedAt,
}: ExchangeFeeListProps) {
  const hasAnyFallback = comparisons.some(({ exchange }) => exchange.source === "fallback");

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-md font-bold">거래소별 출금 조건</h2>

        <ul className="flex flex-col gap-2.5">
          {comparisons.map(
            ({ exchange, exchangeFeeInSats, exchangeFeeInKrw, multipleOfOnChainFee }) => (
              <li
                key={exchange.id}
                className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-base font-bold">
                    {exchange.name}
                    {exchange.source === "fallback" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        저장된 값
                      </span>
                    )}
                    {exchange.isWithdrawAvailable === false && (
                      <span className="rounded-full bg-down/15 px-2 py-0.5 text-[11px] font-bold text-down">
                        출금 중단
                      </span>
                    )}
                  </span>
                  <span className="font-number text-base font-bold">
                    {comma(Math.round(exchangeFeeInKrw))}원
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-number text-xs text-muted-foreground">
                  <span>{exchange.withdrawFeeInBtc} BTC</span>
                  <span>{comma(exchangeFeeInSats)} sats</span>
                  {multipleOfOnChainFee !== null && (
                    <span className="font-bold text-bitcoin">
                      실비의 {multipleOfOnChainFee.toFixed(1)}배
                    </span>
                  )}
                  {exchange.minimumWithdrawInBtc !== null && (
                    <span>최소 {exchange.minimumWithdrawInBtc} BTC</span>
                  )}
                </div>

                {exchange.suspensionMessage && (
                  <p className="text-xs leading-relaxed text-down">{exchange.suspensionMessage}</p>
                )}
              </li>
            ),
          )}
        </ul>

        <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          <span>조회 시각 · {formatKst(fetchedAt)}</span>
          {hasAnyFallback && (
            <span className="text-down">
              일부 거래소는 실시간 조회에 실패해 {verifiedAt} 에 확인한 값을 보여주고 있습니다.
              반드시 거래소에서 직접 확인하세요.
            </span>
          )}
          <span>
            거래소가 수수료를 바꿀 수 있으므로 출금 전에는 각 거래소 안내 페이지를 확인하세요.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
