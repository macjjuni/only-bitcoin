"use client";

import { KButton } from "kku-ui";
import { Check, ChevronDown, Pencil } from "lucide-react";
import { type ChangeEvent, memo, useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useDcaStore } from "@/entities/dca";
import { Card, CardContent, InputGroup, InputGroupInput, UpdownIcon } from "@/shared/ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { calculateDcaSummary } from "../lib/calculateDca";
import { formatBtc } from "../lib/format";

const DcaSummary = () => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  const targetBtcCount = useDcaStore((state) => state.targetBtcCount);
  const setTargetBtcCount = useDcaStore((state) => state.setTargetBtcCount);
  const currentPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const isDetailOpen = useDcaStore((state) => state.isSummaryDetailOpen);
  const setSummaryDetailOpen = useDcaStore((state) => state.setSummaryDetailOpen);
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

  const onClickToggleDetail = () => {
    setSummaryDetailOpen(!isDetailOpen);
  };
  // endregion

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="whitespace-nowrap text-sm text-muted-foreground font-bold">
              총 보유
            </span>
            <span className="truncate text-xl font-bold">
              <span className="text-bitcoin -mr-2">₿</span> {formatBtc(summary.totalBtcCount)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1 text-right">
            <span className="whitespace-nowrap text-sm text-muted-foreground font-bold">
              평가금액
            </span>
            <span className="truncate text-xl font-bold">₩{comma(summary.valuation)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 -mb-2">
          <span className="flex-none whitespace-nowrap text-sm text-muted-foreground font-bold">
            남은 개수
          </span>
          <span className="truncate text-lg font-bold">
            <span className="text-bitcoin">₿</span> {formatBtc(summary.remainingBtcCount)}
          </span>
        </div>

        {isDetailOpen && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex-none whitespace-nowrap text-sm text-muted-foreground font-bold">
                평단가
              </span>
              <span className="truncate text-lg font-bold">₩{comma(summary.avgPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex-none whitespace-nowrap text-sm text-muted-foreground font-bold">
                평가손익
              </span>
              <span
                className={`flex min-w-0 items-center justify-end gap-1.5 text-lg font-bold ${
                  hasRecord ? (isProfitUp ? "text-up" : "text-down") : ""
                }`}
              >
                {hasRecord && <UpdownIcon className="flex-none" size={9} isUp={isProfitUp} />}
                <span className="truncate">₩{comma(Math.abs(summary.profit))}</span>
                <span className="flex-none text-xs">({summary.profitRate.toFixed(2)}%)</span>
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground font-default"
          onClick={onClickToggleDetail}
        >
          {isDetailOpen ? "접기" : "자세히"}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isDetailOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex flex-col gap-1.5 border-t-[0.75px] border-neutral-300 dark:border-neutral-600 pt-3">
          <div className="flex items-center justify-between gap-2 ">
            <span className="flex-none whitespace-nowrap text-sm text-muted-foreground font-bold">
              목표
            </span>

            {isTargetEditing ? (
              <div className="flex items-center gap-3">
                <InputGroup size="md" className="h-9 w-32">
                  <InputGroupInput
                    type="text"
                    inputMode="decimal"
                    maxLength={12}
                    value={targetInput}
                    onChange={onChangeTargetInput}
                    className="font-number text-md font-bold text-right h-full"
                  />
                </InputGroup>
                <KButton variant="ghost" size="icon" onClick={onClickSaveTarget}>
                  <Check size={16} />
                </KButton>
              </div>
            ) : (
              <span className="flex min-w-0 items-center gap-1 text-md font-bold">
                <span className="flex-none text-xl text-bitcoin">₿</span>
                <strong className="truncate text-xl">{formatBtc(targetBtcCount)}</strong>
                <KButton
                  className="ml-3.5 flex-none"
                  variant="ghost"
                  size="icon"
                  onClick={onClickEditTarget}
                >
                  <Pencil size={16} />
                </KButton>
              </span>
            )}
          </div>

          <div className="flex justify-start items-center gap-3">
            <div className="h-4 w-full overflow-hidden rounded-full bg-neutral-300/60 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-bitcoin transition-[width] duration-300"
                style={{ width: `${summary.achievementRate}%` }}
              />
            </div>
            <span className="text-sm font-bold">{summary.achievementRate.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MemoizedDcaSummary = memo(DcaSummary);
MemoizedDcaSummary.displayName = "DcaSummary";

export default MemoizedDcaSummary;
