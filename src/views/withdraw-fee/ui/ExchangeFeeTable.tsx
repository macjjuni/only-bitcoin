import type { ExchangeMeta } from "@/entities/exchange";
import { Card, CardContent } from "@/shared/ui";
import { comma } from "@/shared/utils/string";
import type { WithdrawCell, WithdrawComparisonRow } from "../lib/calculateWithdrawFee";

interface ExchangeFeeTableProps {
  exchanges: ExchangeMeta[];
  rows: WithdrawComparisonRow[];
  fetchedAt: string;
  verifiedAt: string;
}

const formatKst = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

/** 수수료 0 은 "무료" 로 읽는 게 정확함. "0원" 은 값이 안 들어온 것처럼 보임. */
const formatFee = (cell: WithdrawCell) =>
  cell.withdrawFeeInAsset === 0 ? "무료" : `${comma(Math.round(cell.withdrawFeeInKrw))}원`;

/**
 * 자산·망을 행, 거래소를 열로 둔 비교표.
 *
 * 거래소가 늘어나면 열만 추가하면 됨. 한쪽만 지원하는 망은 그 칸을 "미지원" 으로
 * 남겨서 "이 거래소엔 이 망이 없다" 는 정보가 보이게 함.
 */
export default function ExchangeFeeTable({
  exchanges,
  rows,
  fetchedAt,
  verifiedAt,
}: ExchangeFeeTableProps) {
  const hasAnyFallback = exchanges.some((exchange) => exchange.source === "fallback");

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-md font-bold">거래소별 출금 조건</h2>

        {/* 열이 늘어나도 표가 본문 밖으로 안 넘치게 가로 스크롤을 자체 처리함. */}
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[320px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-2 text-left font-bold text-muted-foreground">자산 · 망</th>
                {exchanges.map((exchange) => (
                  <th key={exchange.id} className="py-2 pl-2 text-right font-bold">
                    {exchange.name}
                    {exchange.source === "fallback" && (
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        (저장값)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={`${row.asset}-${row.networkName}`} className="border-b border-border/50">
                  <th scope="row" className="py-2.5 pr-2 text-left align-top font-normal">
                    <span className="font-bold">{row.asset}</span>
                    <span className="ml-1 text-muted-foreground">· {row.networkName}</span>
                  </th>

                  {exchanges.map((exchange) => {
                    const cell = row.cells[exchange.id];

                    return (
                      <td
                        key={exchange.id}
                        className="py-2.5 pl-2 text-right align-top font-number"
                      >
                        {cell ? (
                          <span className="flex flex-col items-end gap-0.5">
                            <span
                              className={
                                cell.withdrawFeeInAsset === 0 ? "font-bold text-up" : "font-bold"
                              }
                            >
                              {formatFee(cell)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {cell.withdrawFeeInAsset} {row.asset}
                            </span>
                            {cell.multipleOfOnChainFee !== null && (
                              <span className="text-[11px] font-bold text-bitcoin">
                                실비 {cell.multipleOfOnChainFee.toFixed(0)}배
                              </span>
                            )}
                            {cell.isWithdrawAvailable === false && (
                              <span className="text-[11px] font-bold text-down">출금 중단</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">미지원</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          <span>
            온체인 실비 배율은 BTC · Bitcoin 행에만 표시합니다. 다른 망은 비교 기준이 달라 같이 놓을
            수 없습니다.
          </span>
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
