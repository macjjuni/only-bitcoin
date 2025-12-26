import { memo, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
  KIcon
} from "kku-ui";
import { CountText, NumberField } from "@/components";
import useStore from "@/shared/stores/store";
import { comma, extractNumbers } from "@/shared/utils/string";
import { useCopyOnClick } from "@/shared/hooks";
import { UnitType } from "@/shared/stores/store.interface";
import { btcToSatoshi, floorToDecimal } from "@/shared/utils/number";
import "./ConvertPanel.scss";


const closeIconCommonProps = {
  icon: "close",
  color: "currentColor",
  size: 32,
  style: { padding: 6 }
};


const ConvertPanel = () => {

  // region [Hooks]
  const btcCountInputRef = useRef<HTMLInputElement>(null);
  const krwRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const satsRef = useRef<HTMLInputElement>(null);

  const { onClickCopy: onClickCopyToBtc } = useCopyOnClick(btcCountInputRef);
  const { onClickCopy: onClickCopyToKrw } = useCopyOnClick(krwRef);
  const { onClickCopy: onClickCopyToUsd } = useCopyOnClick(usdRef);
  const { onClickCopy: onClickCopyToSats } = useCopyOnClick(satsRef);

  const currency = useStore(state => state.setting.currency);
  const krwPrice = useStore(state => state.bitcoinPrice.krw);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);
  const exRate = useStore(state => state.exRate.value);
  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);

  const btcCount = useStore(state => state.btc2Fiat.btcCount);
  const krw = useStore(state => state.btc2Fiat.krw);
  const usd = useStore(state => state.btc2Fiat.usd);
  const sats = useStore(state => state.btc2Fiat.sats);
  const setBtcCount = useStore(state => state.setBtcCount);
  const setKrw = useStore(state => state.setKrw);
  const setUsd = useStore(state => state.setUsd);
  const setSats = useStore(state => state.setSats);
  const premium = useStore(state => state.premium);
  const setPremium = useStore(state => state.setPremium);

  const focusCurrency = useStore(state => state.focusCurrency);
  const setFocusCurrency = useStore(state => state.setFocusCurrency);

  const unitList = useMemo(() => ["BTC"].concat(currency.split("/")).concat("SATS"), [currency]) as UnitType[];
  // endregion


  // region [Privates]
  const btcFormatter = useCallback((btcNum: number) => {

    if (btcNum < 1e-8) {
      return "0";
    }
    return btcNum.toFixed(8).replace(/\.?0+$/, ""); // 숫자 뒤에 0 제거 정규식
  }, []);

  const satoshiFormatter = useCallback((satoshi: number) => {

    if (satoshi < 1) {
      return "0";
    }
    return (satoshi / 100_000_000).toFixed(8).replace(/\.?0+$/, "");
  }, []);

  const synchronizeValue = useCallback(() => {

    if (focusCurrency === "BTC") {

      const btcCountNum = parseFloat(btcCount.replace(/,/g, ""));
      const usdFromBtcCount = floorToDecimal(usdPrice * btcCountNum, 2);

      setUsd(comma(usdFromBtcCount, false));
      setKrw(comma(krwPrice * btcCountNum));
      setSats(btcToSatoshi(btcCountNum));
    }

    if (focusCurrency === "KRW") {

      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountFromKrw = floorToDecimal(krwNum / krwPrice, 8);
      const usdFromKrw = (krwNum / exRate).toFixed(2);

      setBtcCount(comma(btcFormatter(btcCountFromKrw)));
      setUsd(Number(usdFromKrw) === 0 ? "0" : comma(usdFromKrw));
      setSats(btcToSatoshi(krwNum / krwPrice));
    }

    if (focusCurrency === "USD") {

      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcCountFromUsd = floorToDecimal(usdNum / usdPrice, 8);

      setBtcCount(btcFormatter(btcCountFromUsd));
      setKrw(comma(Math.floor(usdNum * exRate)));
      setSats(btcToSatoshi(btcCountFromUsd));
    }

    if (focusCurrency === "SATS") {

      const satsNum = parseFloat(sats.replace(/,/g, ""));
      const btcCountNum = satoshiFormatter(satsNum);
      const usdFromBtcCount = floorToDecimal(usdPrice * Number(btcCountNum), 2);

      setKrw(comma(krwPrice * Number(btcCountNum)));
      setUsd(comma(usdFromBtcCount, false));
      setBtcCount(Number(btcCountNum) === 0 ? "0" : comma(btcCountNum));
    }

  }, [focusCurrency, btcCount, krw, usd, sats, krwPrice, usdPrice, exRate]);


  const initializeBtcCount = useCallback(() => {
    setBtcCount("0");
    btcCountInputRef.current?.focus();
  }, []);

  const initializeSats = useCallback(() => {
    setSats("0");
    satsRef.current?.focus();
  }, []);

  const initializeKrw = useCallback(() => {
    setKrw("0");
    krwRef.current?.focus();
  }, []);

  const initializeUsd = useCallback(() => {
    setUsd("0");
    usdRef.current?.focus();
  }, []);

  const calcPremium = useCallback((price: string, unit?: "KRW" | "USD" | "BTC" | "SATS"): string => {
    if (premium === 0) {
      return price;
    }

    const numPrice = extractNumbers(price);
    if (Number.isNaN(numPrice)) return price;

    const applied = numPrice * (1 + premium / 100);
    const decimalMap = { KRW: 0, SATS: 0, USD: 2, BTC: 8 };
    const decimals = decimalMap[unit ?? "USD"];
    const fixed = applied.toFixed(decimals);

    if (applied === 0) {
      return "0";
    }
    if (applied < 1) {
      return fixed.replace(/\.?0+$/, "");
    }

    // 6) comma로 천단위 + 필요 시 소숫점 제거 옵션
    return comma(Number(fixed), decimals === 0);
  }, [premium]);

  const resetPremium = useCallback(() => {
    setPremium(0);
  }, []);

  const calcStringNumber = useCallback((valueA: string, valueB: string, decimal = 2) => {
    const strVal = extractNumbers(valueA) - extractNumbers(valueB);
    return comma(strVal.toFixed(decimal), false);
  }, []);
  // endregion


  // region [Events]
  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);
  const onChangeSats = useCallback(setSats, []);
  const onClickUnitItem = useCallback((unit: UnitType) => {
    setFocusCurrency(unit);
    resetPremium();
  }, []);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krw, usd, krwPrice, usdPrice, sats, premium]);
  // endregion


  // region [Left Action]
  const BtcLeftAction = useMemo(() => {
    if (focusCurrency !== "BTC") {
      return;
    }
    if (["0", ""].includes(btcCount)) {
      return null;
    }
    return (<KIcon {...closeIconCommonProps} onClick={initializeBtcCount} />);
  }, [focusCurrency, btcCount]);

  const SatsLeftAction = useMemo(() => {
    if (focusCurrency !== "SATS") {
      return;
    }
    if (["0", ""].includes(sats)) {
      return null;
    }
    return (<KIcon {...closeIconCommonProps} onClick={initializeSats} />);
  }, [focusCurrency, sats]);

  const KrwLeftAction = useMemo(() => {
    if (focusCurrency !== "KRW") {
      return;
    }
    if (["0", ""].includes(krw)) {
      return null;
    }
    return (<KIcon {...closeIconCommonProps} onClick={initializeKrw} />);
  }, [focusCurrency, krw]);

  const UsdLeftAction = useMemo(() => {
    if (focusCurrency !== "USD") {
      return;
    }
    if (["0", ""].includes(usd)) {
      return null;
    }
    return (<KIcon {...closeIconCommonProps} onClick={initializeUsd} />);
  }, [focusCurrency, usd]);
  // endregion


  // region [templates]
  const NumberFieldIUnit = useCallback((unit: UnitType) => {
    const UNIT_DISPLAY: Record<UnitType, ReactNode> = {
      KRW: "KRW",
      USD: "USD",
      BTC: "BTC",
      SATS: "Sats"
    };

    const currentLabel = UNIT_DISPLAY[unit] || unit;

    if (focusCurrency !== unit) {
      return currentLabel;
    }

    return (
      <KDropdownMenu size="md">
        <KDropdownMenuTrigger className={`flex gap-0.5 items-center rounded-[3px] text-md font-bold px-1 py-[3px]
         bg-neutral-200 dark:bg-neutral-700 data-[state=open]:bg-neutral-300 dark:data-[state=open]:bg-neutral-600
          ${focusCurrency === "SATS" && "tracking-[-1.5px]"}`}>
          {UNIT_DISPLAY[focusCurrency]}
          <KIcon icon="keyboard_arrow_down" size={10} />
        </KDropdownMenuTrigger>

        <KDropdownMenuContent className="unit__area__content" side="bottom" align="end" sideOffset={16}
                              alignOffset={-8}>
          <KDropdownMenuLabel>단위 설정</KDropdownMenuLabel>
          {unitList.map((unitItem) => (
            <KDropdownMenuCheckboxItem
              key={unitItem}
              className="select-unit__list__item"
              checked={focusCurrency === unitItem}
              onCheckedChange={() => onClickUnitItem(unitItem)}
            >
              {unitItem === "SATS" ? "Sats" : unitItem}
            </KDropdownMenuCheckboxItem>
          ))}
        </KDropdownMenuContent>
      </KDropdownMenu>
    );
  }, [focusCurrency, unitList, onClickUnitItem]);


  const KrwNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "KRW";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = isCurrentCurrency ? krw : calcPremium(krw, "KRW"); // readonly일 때만 프리미엄 적용
    const incrementValue = calcStringNumber(displayValue, krw, 0);

    return (
      <div className="flex flex-col font-number">
        <NumberField ref={krwRef} value={displayValue} dataCopy={displayValue} isPremium={premium !== 0}
                     unit={NumberFieldIUnit("KRW")} maxLength={15} readonly={focusCurrency !== "KRW"}
                     onChange={onChangeKrw} onClick={onClickCopyToKrw} leftAction={KrwLeftAction} />
        {
          isShowPremiumExpression &&
          <span className="flex justify-end items-center gap-3 text-base px-3">
            {incrementValue} + {krw}
            <span className="pl-3.5 text-lg">KRW</span>
          </span>
        }
        <span className="flex justify-end items-center gap-3 text-base px-3">
          1BTC = <CountText value={krwPrice} />
          <span className="pl-3.5 text-lg">KRW</span>
        </span>
      </div>
    );
  }, [krw, krwPrice, NumberFieldIUnit, focusCurrency, calcPremium, premium]);


  const UsdNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "USD";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = isCurrentCurrency ? usd : calcPremium(usd, "USD");
    const incrementValue = calcStringNumber(displayValue, usd);

    return (
      <div className="flex flex-col font-number">
        <NumberField ref={usdRef} value={displayValue} readonly={focusCurrency !== "USD"} isPremium={premium !== 0}
                     dataCopy={displayValue} unit={NumberFieldIUnit("USD")} maxLength={15}
                     onChange={onChangeUsd} onClick={onClickCopyToUsd} leftAction={UsdLeftAction} />
        {isShowPremiumExpression &&
          <span className="flex justify-end items-center gap-3 text-base px-3">
            {incrementValue} + {usd}
            <span className="pl-3.5 text-lg">USD</span>
          </span>}
        <span className="flex justify-end items-center gap-3 text-base px-3">
        {isUsdtStandard ? "1USDT" : "$1"} = ₩{exRate} {` | `}
          <span>1BTC = <CountText value={usdPrice} /></span>
          <span className="pl-3.5 text-lg">USD</span>
        </span>
      </div>
    );
  }, [usd, usdPrice, NumberFieldIUnit, focusCurrency, exRate, calcPremium, premium]);

  const BtcNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "BTC";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = focusCurrency === "BTC" ? btcCount : calcPremium(btcCount, "BTC");
    const incrementValue = calcStringNumber(displayValue, btcCount, 8);

    return (
      <div className="flex flex-col font-number">
        <NumberField ref={btcCountInputRef} value={displayValue} readonly={focusCurrency !== "BTC"}
                     dataCopy={displayValue} unit={NumberFieldIUnit("BTC")} maxLength={15} isPremium={premium !== 0}
                     onChange={onChangeBtcCount} onClick={onClickCopyToBtc} leftAction={BtcLeftAction} />
        {isShowPremiumExpression &&
          <span className="flex justify-end items-center gap-3 text-base px-3">
            {incrementValue} + {btcCount}
            <span className="pl-5 pr-0.5">BTC</span>
          </span>}
      </div>
    );
  }, [btcCount, NumberFieldIUnit, focusCurrency, calcPremium, premium]);

  const SatsNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "SATS";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = focusCurrency === "SATS" ? sats : calcPremium(sats, "SATS");
    const incrementValue = calcStringNumber(displayValue, sats, 0);

    return (
      <div className="flex flex-col font-number">
        <NumberField ref={satsRef} className="convert-pannel__item__input" value={displayValue} isPremium={premium !== 0}
                     readonly={focusCurrency !== "SATS"} dataCopy={displayValue} unit={NumberFieldIUnit("SATS")}
                     maxLength={15} onChange={onChangeSats} onClick={onClickCopyToSats} leftAction={SatsLeftAction} />
        {isShowPremiumExpression &&
          <span className="flex justify-end items-center gap-3 text-base px-3">
            {incrementValue} + {sats}
            <span className="pl-5 pr-0.5 tracking-[-1px]">Sats</span>
          </span>}
      </div>
    );
  }, [sats, SatsLeftAction, focusCurrency, calcPremium, premium]);


  const SortNumberField = useMemo(() => {

    if (["BTC", "SATS"].includes(focusCurrency)) {

      return (
        <>
          {focusCurrency === "BTC" ? null : BtcNumberField}
          {KrwNumberField}
          {UsdNumberField}
          {focusCurrency === "BTC" ? SatsNumberField : null}
          {focusCurrency === "BTC" ? BtcNumberField : SatsNumberField}
        </>
      );
    }

    if (["KRW", "USD"].includes(focusCurrency)) {
      return (
        <>
          {BtcNumberField}
          {SatsNumberField}
          {
            focusCurrency === "KRW" ?
              <>{UsdNumberField}{KrwNumberField}</> :
              <>{KrwNumberField}{UsdNumberField}</>
          }
        </>
      );
    }
  }, [focusCurrency, currency, BtcNumberField, KrwNumberField, UsdNumberField, SatsNumberField]);
  // endregion

  return (
    <div className={`flex flex-col gap-2 pt-6 ${premium ? '[&>*:nth-child(4)]:mt-[32px]' : '[&>*:nth-child(4)]:mt-[112px]'}`}>
      {SortNumberField}
    </div>
  );
};


const MemoizedConvertPanel = memo(ConvertPanel);
MemoizedConvertPanel.displayName = "MemoizedConvertPanel";

export default MemoizedConvertPanel;
