import { memo, useCallback, useEffect, useMemo, useRef, useState, Fragment, useLayoutEffect } from "react";
import { KDropHolder, KDropHolderRefs, KIcon } from "kku-ui";
import { CountText, NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { useCopyOnClick } from "@/shared/hooks";
import storageUitl from "@/shared/utils/storage";
import "./ConvertPannel.scss";


type UnitType = "BTC" | "USD" | "KRW";

const BTC_TO_FIAT = "BTC_TO_FIAT" as const;
const BTC_UNIT_KEY = "BTC_UNIT_KEY" as const;


const ConvertPannel = () => {

  // region [Hooks]

  const btcCountInputRef = useRef<HTMLInputElement>(null);
  const krwRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const satRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<KDropHolderRefs>(null);

  const { onClickCopy: onClickCopyToBtc } = useCopyOnClick(btcCountInputRef);
  const { onClickCopy: onClickCopyToKrw } = useCopyOnClick(krwRef);
  const { onClickCopy: onClickCopyToUsd } = useCopyOnClick(usdRef);
  const { onClickCopy: onClickCopyToSat } = useCopyOnClick(satRef);

  const currency = useStore(state => state.setting.currency);
  const krwPrice = useStore(state => state.bitcoinPrice.krw);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);
  const exRate = useStore(state => state.exRate.value);

  const [btcCount, setBtcCount] = useState("1");

  const [krw, setKrw] = useState("0");
  const [usd, setUsd] = useState("0");

  const [focusUnit, setFocusUnit] = useState<UnitType | null>(null);

  const unitList = useMemo(() => ["BTC"].concat(currency.split("/")), [currency]) as UnitType[];

  // endregion


  // region [Privates]

  const saveFocusValueInStorage = useCallback((value: string) => {
    storageUitl.setItem(BTC_TO_FIAT, value);
  }, []);

  const saveUnitInStorage = useCallback((value: UnitType) => {
    storageUitl.setItem(BTC_UNIT_KEY, value);
  }, []);

  const currentSaveInStorage = useCallback(() => {

    if (focusUnit === "BTC") {
      saveFocusValueInStorage(btcCount);
    }
    if (focusUnit === "KRW") {
      saveFocusValueInStorage(krw);
    }
    if (focusUnit === "USD") {
      saveFocusValueInStorage(usd);
    }
  }, [krw, usd, btcCount, focusUnit]);

  const synchronizeValue = useCallback(() => {

    if (focusUnit === "BTC") {

      const btcCountNum = parseFloat(btcCount.replace(/,/g, ""));

      setUsd(comma(Math.floor(usdPrice * btcCountNum)));
      setKrw(comma(Math.floor(krwPrice * btcCountNum)));
    }

    if (focusUnit === "KRW") {

      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountFromKrw = (krwNum / krwPrice).toFixed(8);
      const usdFromKrw = (krwNum / exRate).toFixed(2);

      setBtcCount(Number(btcCountFromKrw) === 0 ? "0" : comma(btcCountFromKrw));
      setUsd(Number(usdFromKrw) === 0 ? "0" : comma(usdFromKrw));
    }

    if (focusUnit === "USD") {

      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcCountFromUsd = (usdNum / usdPrice).toFixed(8);

      setBtcCount(Number(btcCountFromUsd) === 0 ? "0" : comma(btcCountFromUsd));
      setKrw(comma(Math.floor(usdNum * exRate)));
    }
  }, [focusUnit, btcCount, krw, usd, krwPrice, usdPrice, exRate]);

  const initializeBtcCount = useCallback(() => {
    setBtcCount("0");
    btcCountInputRef.current?.focus();
  }, []);

  const initializeKrw = useCallback(() => {
    setKrw("0");
    krwRef.current?.focus();
  }, []);

  const initializeUsd = useCallback(() => {
    setUsd("0");
    usdRef.current?.focus();
  }, []);

  const initializeStorageData = useCallback(() => {

    const btcToFiatValueInStorage: string = storageUitl.getItem(BTC_TO_FIAT) || "1";
    const focusUnitInStorage: UnitType = storageUitl.getItem(BTC_UNIT_KEY) || "BTC";

    if (focusUnitInStorage === "BTC") {
        setBtcCount(btcToFiatValueInStorage);
        setFocusUnit(focusUnitInStorage);
        return ;
    }

    // 설정에서 통화단위 변경 됐고 사라진 KRW/USD 가 포커싱 된 경우 초기화
    const isError = !currency.includes(focusUnitInStorage);

    if (isError) {
      setFocusUnit("BTC");
      setBtcCount("1");

      return;
    }

    if (focusUnitInStorage === "KRW") { setKrw(btcToFiatValueInStorage); }
    if (focusUnitInStorage === "USD") { setUsd(btcToFiatValueInStorage); }

    setFocusUnit(focusUnitInStorage);
  }, []);

  // endregion


  // region [Events]

  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);

  // endregion


  // region [Life Cycles]

  useLayoutEffect(() => {
    initializeStorageData();
  }, []);

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krw, usd, krwPrice, usdPrice]);

  useEffect(() => {
    currentSaveInStorage();
  }, [krw, usd, btcCount, focusUnit]);

  useEffect(() => {
    saveUnitInStorage(focusUnit || "BTC");
    dropdownRef.current?.close();
  }, [focusUnit]);

  // endregion


  // region [Left Action]

  const BtcLeftAction = useMemo(() => {

    if (focusUnit !== "BTC") { return; }
    if (["0", ""].includes(btcCount)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeBtcCount} style={{ padding: "6px" }} />);
  }, [focusUnit, btcCount]);

  const KrwLeftAction = useMemo(() => {

    if (focusUnit !== "KRW") { return; }
    if (["0", ""].includes(krw)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeKrw} style={{ padding: "6px" }} />);
  }, [focusUnit, krw]);

  const UsdLeftAction = useMemo(() => {

    if (focusUnit !== "USD") { return; }
    if (["0", ""].includes(usd)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeUsd} style={{ padding: "6px" }} />);
  }, [focusUnit, usd]);

  // endregion


  // region [templates]

  const SatValue = useMemo(() => (
    (BigInt(Math.floor(parseFloat(btcCount) * 100000000)) * 1n).toLocaleString()
  ), [btcCount]);


  const SelectUnitList = useMemo(() => {

    const filteredList = unitList.filter(unit => unit !== focusUnit);

    return (
      <ul className="select-unit__list">
        {filteredList.map((unit) => (
          <li key={unit} className="select-unit__list__item">
            <button className="select-unit__list__item__button" type="button"
                    onClick={() => {setFocusUnit(unit);}}>{unit}</button>
          </li>)
        )}
      </ul>);
  }, [unitList, focusUnit]);


  const NumberFieldIUnit = useCallback((unit: UnitType) => {

    if (focusUnit !== unit) { return unit; }

    return (
      <KDropHolder content={SelectUnitList} position="top-right" offset="12px">
        <div className="focus-unit__area">
          {focusUnit} <KIcon className="focus-unit__area__icon" icon="keyboard_arrow_down" size={12} />
        </div>
      </KDropHolder>
    );
  }, [focusUnit, SelectUnitList]);


  const KrwNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={krwRef} className="convert-pannel__item__input clickable" value={krw} readonly={focusUnit !== "KRW"}
                   dataCopy={krw} unit={NumberFieldIUnit("KRW")} maxLength={15} onChange={onChangeKrw}
                   onClick={onClickCopyToKrw} leftAction={KrwLeftAction} />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={krwPrice} /> KRW</span>
    </div>
  ), [krw, krwPrice, NumberFieldIUnit, focusUnit]);


  const UsdNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={usdRef} className="convert-pannel__item__input clickable" value={usd} readonly={focusUnit !== "USD"}
                   dataCopy={usd} unit={NumberFieldIUnit("USD")} maxLength={15} onChange={onChangeUsd}
                   onClick={onClickCopyToUsd} leftAction={UsdLeftAction} />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={usdPrice} /> USD</span>
    </div>
  ), [usd, usdPrice, NumberFieldIUnit, focusUnit]);


  const BtcNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={btcCountInputRef} className="convert-pannel__item__input" value={btcCount} readonly={focusUnit !== "BTC"}
                   dataCopy={btcCount} unit={NumberFieldIUnit("BTC")} maxLength={15} onChange={onChangeBtcCount}
                   onClick={onClickCopyToBtc} leftAction={BtcLeftAction} />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <span ref={satRef} className="convert-pannel__item__sub-text" data-copy={SatValue} onClick={onClickCopyToSat}>
        {btcCount}
        BTC / {SatValue} Sats
      </span>
    </div>
  ), [btcCount, NumberFieldIUnit, focusUnit]);


  const SortNumberField = useMemo(() => {

    const unitOrder = (["BTC", "KRW", "USD"] as UnitType[]).filter(unit => unit !== focusUnit);

    if (focusUnit !== null) {
      unitOrder.push(focusUnit);
    }

    const fieldMap: Record<string, React.ReactNode> = {
      BTC: BtcNumberField,
      KRW: currency.includes("KRW") ? KrwNumberField : null,
      USD: currency.includes("USD") ? UsdNumberField : null
    };

    return (<>{unitOrder.map(unit => (<Fragment key={unit}>{fieldMap[unit]}</Fragment>))}</>);
  }, [focusUnit, currency, BtcNumberField, KrwNumberField, UsdNumberField]);

  // endregion


  return (
    <div className="convert-pannel">
      {SortNumberField}
    </div>
  );
};

export default memo(ConvertPannel);
