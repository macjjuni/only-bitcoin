"use client";

import { KButton, KTextarea } from "kku-ui";
import { type ChangeEvent, memo, useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { type TradeRecord, type TradeType, useDcaStore } from "@/entities/dca";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { calculateHoldingBtcCount } from "../lib/calculateDca";
import { formatBtc, getTodayString } from "../lib/format";

const BTC_MAX_DECIMALS = 8;
const PRICE_FLOOR_UNIT = 1_000_000; // 매매 단가 초기값 버림 단위 (백만원)
const MEMO_MAX_LENGTH = 200;

interface TradeFormProps {
  editRecord: TradeRecord | null; // null 이면 신규 추가 모드
  onClose: () => void;
}

const TradeForm = ({ editRecord, onClose }: TradeFormProps) => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  const addRecord = useDcaStore((state) => state.addRecord);
  const updateRecord = useDcaStore((state) => state.updateRecord);
  const currentPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const [tradeType, setTradeType] = useState<TradeType>(editRecord?.type ?? "buy");
  const [date, setDate] = useState(editRecord?.date ?? getTodayString());
  const [btcCountInput, setBtcCountInput] = useState(editRecord ? String(editRecord.btcCount) : "");
  const [memoInput, setMemoInput] = useState(editRecord?.memo ?? "");
  const [priceInput, setPriceInput] = useState(() => {
    if (editRecord) {
      return comma(editRecord.price);
    }
    // 신규 추가 모드: 다이얼로그 오픈 시점의 현재가를 백만원 단위 아래로 버림 처리해 초기값으로 사용
    const flooredPrice = Math.floor(currentPrice / PRICE_FLOOR_UNIT) * PRICE_FLOOR_UNIT;
    return flooredPrice > 0 ? comma(flooredPrice) : "";
  });
  // endregion

  // region [Privates]
  const isBuy = tradeType === "buy";
  const typeLabel = isBuy ? "매수" : "매도";
  const btcCount = parseFloat(btcCountInput) || 0;
  const price = parseFloat(priceInput.replace(/,/g, "")) || 0;

  /** 매도 가능 개수: 자기 자신(수정 모드)을 제외한 현재 총 보유 개수 */
  const sellableBtcCount = useMemo(() => {
    return calculateHoldingBtcCount(records, editRecord?.id);
  }, [records, editRecord]);

  const isOverSell = !isBuy && btcCount > sellableBtcCount;
  const isValid = date !== "" && btcCount > 0 && price > 0 && !isOverSell;

  const totalAmount = useMemo(() => {
    return Math.round(btcCount * price);
  }, [btcCount, price]);
  // endregion

  // region [Events]
  const onClickBuyType = () => {
    setTradeType("buy");
  };

  const onClickSellType = () => {
    setTradeType("sell");
  };

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

  const onChangeMemo = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMemoInput(e.target.value);
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

    // 빈 메모는 저장하지 않는다. (JSON 직렬화 시 undefined 필드는 제거됨)
    const trimmedMemo = memoInput.trim();
    const memoText = trimmedMemo !== "" ? trimmedMemo : undefined;

    if (editRecord) {
      updateRecord({ ...editRecord, type: tradeType, date, btcCount, price, memo: memoText });
    } else {
      addRecord({ type: tradeType, date, btcCount, price, memo: memoText });
    }
    onClose();
  };

  const onClickCancel = () => {
    onClose();
  };
  // endregion

  return (
    <div className="flex flex-col gap-3 pt-2 font-number">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200/70 p-1 dark:bg-neutral-800">
        <KButton
          variant="ghost"
          size="sm"
          width="100%"
          className={`font-default font-bold ${isBuy ? "bg-up/15 !text-up" : "text-muted-foreground"}`}
          onClick={onClickBuyType}
        >
          매수
        </KButton>
        <KButton
          variant="ghost"
          size="sm"
          width="100%"
          className={`font-default font-bold ${!isBuy ? "bg-down/15 !text-down" : "text-muted-foreground"}`}
          onClick={onClickSellType}
        >
          매도
        </KButton>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground font-default">{typeLabel} 날짜</span>
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
        <span className="text-sm text-muted-foreground font-default">{typeLabel} 개수 (BTC)</span>
        <InputGroup size="sm" className="h-10">
          <InputGroupAddon align="inline-start" className="!text-bitcoin text-lg font-bold">
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
        {isOverSell && (
          <p className="text-right text-xs text-down font-default">
            보유 개수(₿ {formatBtc(sellableBtcCount)})까지만 매도할 수 있어요.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground font-default">
          {typeLabel} 단가 (KRW/BTC)
        </span>
        <InputGroup size="sm" className="h-10">
          <InputGroupAddon align="inline-start" className="text-[15px] font-bold">
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

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground font-default">메모 (선택)</span>
        <KTextarea
          rows={2}
          maxLength={MEMO_MAX_LENGTH}
          placeholder="예: 월급날 정기 매수"
          value={memoInput}
          onChange={onChangeMemo}
          className="resize-none font-default text-sm"
        />
      </div>

      {totalAmount > 0 && (
        <p className="text-right text-sm text-muted-foreground">
          총 {typeLabel}금액{" "}
          <span className="font-bold text-foreground">₩{comma(totalAmount)}</span>
        </p>
      )}

      <div className="flex gap-2">
        <KButton variant="outline" className="flex-1" size="lg" onClick={onClickCancel}>
          취소
        </KButton>
        <KButton className="flex-1 bg-bitcoin" size="lg" disabled={!isValid} onClick={onClickSave}>
          {editRecord ? "수정" : "추가"}
        </KButton>
      </div>
    </div>
  );
};

const MemoizedTradeForm = memo(TradeForm);
MemoizedTradeForm.displayName = "TradeForm";

export default MemoizedTradeForm;
