"use client";

import { KButton, kToast } from "kku-ui";
import { type ChangeEvent, memo, useMemo, useState } from "react";
import { Card, CardContent, InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { getTodayString } from "../lib/format";
import useDcaStore, { type PurchaseRecord } from "../model/dcaStore";

const BTC_MAX_DECIMALS = 8;

interface PurchaseFormProps {
  editRecord: PurchaseRecord | null; // null 이면 신규 추가 모드
  onClose: () => void;
}

const PurchaseForm = ({ editRecord, onClose }: PurchaseFormProps) => {
  // region [Hooks]
  const addRecord = useDcaStore((state) => state.addRecord);
  const updateRecord = useDcaStore((state) => state.updateRecord);
  const [date, setDate] = useState(editRecord?.date ?? getTodayString());
  const [btcCountInput, setBtcCountInput] = useState(editRecord ? String(editRecord.btcCount) : "");
  const [priceInput, setPriceInput] = useState(editRecord ? comma(editRecord.price) : "");
  // endregion

  // region [Privates]
  const btcCount = parseFloat(btcCountInput) || 0;
  const price = parseFloat(priceInput.replace(/,/g, "")) || 0;
  const isValid = date !== "" && btcCount > 0 && price > 0;

  const totalCost = useMemo(() => {
    return Math.round(btcCount * price);
  }, [btcCount, price]);
  // endregion

  // region [Events]
  const onChangeDate = (e: ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  const onChangeBtcCount = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;

    if (text === "") {
      return setBtcCountInput("");
    }
    if (!isNumber(text)) {
      return;
    }

    const [, decimal] = text.split(".");
    if (decimal && decimal.length > BTC_MAX_DECIMALS) {
      return;
    }

    setBtcCountInput(text);
  };

  const onChangePrice = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/,/g, "");

    if (text === "") {
      return setPriceInput("");
    }
    if (!isNumber(text) || text.includes(".")) {
      return;
    }

    setPriceInput(comma(parseInt(text, 10)));
  };

  const onClickSave = () => {
    if (!isValid) {
      return;
    }

    if (editRecord) {
      updateRecord({ ...editRecord, date, btcCount, price });
      kToast.success("매수 기록을 수정했어요.");
    } else {
      addRecord({ date, btcCount, price });
      kToast.success("매수 기록을 추가했어요.");
    }
    onClose();
  };

  const onClickCancel = () => {
    onClose();
  };
  // endregion

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-default">매수 날짜</span>
          <InputGroup size="sm" className="h-10">
            <InputGroupInput
              type="date"
              max={getTodayString()}
              value={date}
              onChange={onChangeDate}
              className="font-number text-md font-bold h-full"
            />
          </InputGroup>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-default">매수 개수 (BTC)</span>
          <InputGroup size="sm" className="h-10">
            <InputGroupAddon align="inline-start" className="!text-bitcoin font-bold">
              ₿
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              inputMode="decimal"
              maxLength={12}
              placeholder="0.001"
              value={btcCountInput}
              onChange={onChangeBtcCount}
              className="font-number text-md font-bold text-right h-full"
            />
          </InputGroup>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-default">매수 단가 (KRW/BTC)</span>
          <InputGroup size="sm" className="h-10">
            <InputGroupAddon align="inline-start" className="font-bold">
              ₩
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              inputMode="numeric"
              maxLength={15}
              placeholder="150,000,000"
              value={priceInput}
              onChange={onChangePrice}
              className="font-number text-md font-bold text-right h-full"
            />
          </InputGroup>
        </div>

        {totalCost > 0 && (
          <p className="text-right text-sm text-muted-foreground">
            총 매수금액 <span className="font-bold text-foreground">₩{comma(totalCost)}</span>
          </p>
        )}

        <div className="flex gap-2">
          <KButton variant="outline" className="flex-1" onClick={onClickCancel}>
            취소
          </KButton>
          <KButton className="flex-1" disabled={!isValid} onClick={onClickSave}>
            {editRecord ? "수정" : "추가"}
          </KButton>
        </div>
      </CardContent>
    </Card>
  );
};

const MemoizedPurchaseForm = memo(PurchaseForm);
MemoizedPurchaseForm.displayName = "PurchaseForm";

export default MemoizedPurchaseForm;
