"use client";

import { KButton } from "kku-ui";
import { Check, Pencil } from "lucide-react";
import { type ChangeEvent, memo, useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { Card, CardContent, InputGroup, InputGroupInput, UpdownIcon } from "@/shared/ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { calculateDcaSummary } from "../lib/calculateDca";
import { formatBtc } from "../lib/format";
import useDcaStore from "../model/dcaStore";

const DcaSummary = () => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  const targetBtcCount = useDcaStore((state) => state.targetBtcCount);
  const setTargetBtcCount = useDcaStore((state) => state.setTargetBtcCount);
  const currentPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const [isTargetEditing, setIsTargetEditing] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  // endregion

  // region [Privates]
  const summary = useMemo(
    () => calculateDcaSummary(records, targetBtcCount, currentPrice),
    [records, targetBtcCount, currentPrice],
  );

  const isProfitUp = summary.profit >= 0;
  const hasRecord = records.length > 0;

  /**
   * 입력값을 검증하고 목표 개수를 저장한 뒤 편집 모드를 닫는다.
   */
  const saveTargetBtcCount = () => {
    const parsed = parseFloat(targetInput);

    if (Number.isFinite(parsed) && parsed > 0) {
      setTargetBtcCount(parseFloat(parsed.toFixed(8)));
    }
    setIsTargetEditing(false);
  };
  // endregion

  // region [Events]
  const onClickEditTarget = () => {
    setTargetInput(formatBtc(targetBtcCount));
    setIsTargetEditing(true);
  };

  const onClickSaveTarget = () => {
    saveTargetBtcCount();
  };

  const onChangeTargetInput = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;

    if (text === "" || isNumber(text)) {
      setTargetInput(text);
    }
  };
  // endregion

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-default">총 보유</span>
            <span className="text-xl font-bold">
              <span className="text-bitcoin">₿</span> {formatBtc(summary.totalBtcCount)}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs text-muted-foreground font-default">평단가</span>
            <span className="text-xl font-bold">₩{comma(summary.avgPrice)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-default">평가금액</span>
            <span className="text-lg font-bold">₩{comma(summary.valuation)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs text-muted-foreground font-default">평가손익</span>
            <span
              className={`flex items-center justify-end gap-1.5 text-lg font-bold ${
                hasRecord ? (isProfitUp ? "text-up" : "text-down") : ""
              }`}
            >
              {hasRecord && <UpdownIcon size={9} isUp={isProfitUp} />}₩
              {comma(Math.abs(summary.profit))}
              <span className="text-xs">({summary.profitRate.toFixed(2)}%)</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t-[0.75px] border-neutral-300 dark:border-neutral-600 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-default">목표</span>

            {isTargetEditing ? (
              <div className="flex items-center gap-1">
                <InputGroup size="sm" className="h-8 w-32">
                  <InputGroupInput
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    value={targetInput}
                    onChange={onChangeTargetInput}
                    className="font-number text-sm font-bold text-right h-full"
                  />
                </InputGroup>
                <KButton variant="ghost" size="icon" onClick={onClickSaveTarget}>
                  <Check size={16} />
                </KButton>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className="text-bitcoin">₿</span> {formatBtc(targetBtcCount)}
                <KButton variant="ghost" size="icon" onClick={onClickEditTarget}>
                  <Pencil size={13} />
                </KButton>
              </span>
            )}
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-300/60 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-bitcoin transition-[width] duration-300"
              style={{ width: `${summary.achievementRate}%` }}
            />
          </div>

          <div className="flex justify-between text-xs">
            <span className="font-bold">{summary.achievementRate.toFixed(1)}%</span>
            <span>
              남은 개수 <span className="font-bold">{formatBtc(summary.remainingBtcCount)}</span>{" "}
              BTC
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MemoizedDcaSummary = memo(DcaSummary);
MemoizedDcaSummary.displayName = "DcaSummary";

export default MemoizedDcaSummary;
