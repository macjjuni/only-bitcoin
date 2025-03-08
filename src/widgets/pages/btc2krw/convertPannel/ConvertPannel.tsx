import { Fragment, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { KDropHolder, KDropHolderRefs, KIcon } from "kku-ui";
import { CountText, NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { useCopyOnClick } from "@/shared/hooks";
import { UnitType } from "@/shared/stores/store.interface";
import "./ConvertPannel.scss";


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

  const btcCount = useStore(state => state.btc2Fiat.btcCount);
  const krw = useStore(state => state.btc2Fiat.krw);
  const usd = useStore(state => state.btc2Fiat.usd);
  const setBtcCount = useStore(state => state.setBtcCount);
  const setKrw = useStore(state => state.setKrw);
  const setUsd = useStore(state => state.setUsd);

  const focusCurrency = useStore(state => state.focusCurrency);
  const setFocusCurrency = useStore(state => state.setFocusCurrency);

  const unitList = useMemo(() => ["BTC"].concat(currency.split("/")), [currency]) as UnitType[];

  // endregion


  // region [Privates]

  const synchronizeValue = useCallback(() => {

    if (focusCurrency === "BTC") {

      const btcCountNum = parseFloat(btcCount.replace(/,/g, ""));

      setUsd(comma(Math.floor(usdPrice * btcCountNum)));
      setKrw(comma(Math.floor(krwPrice * btcCountNum)));
    }

    if (focusCurrency === "KRW") {

      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountFromKrw = (krwNum / krwPrice).toFixed(8);
      const usdFromKrw = (krwNum / exRate).toFixed(2);

      setBtcCount(Number(btcCountFromKrw) === 0 ? "0" : comma(btcCountFromKrw));
      setUsd(Number(usdFromKrw) === 0 ? "0" : comma(usdFromKrw));
    }

    if (focusCurrency === "USD") {

      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcCountFromUsd = (usdNum / usdPrice).toFixed(8);

      setBtcCount(Number(btcCountFromUsd) === 0 ? "0" : comma(btcCountFromUsd));
      setKrw(comma(Math.floor(usdNum * exRate)));
    }
  }, [focusCurrency, btcCount, krw, usd, krwPrice, usdPrice, exRate]);

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

  // endregion


  // region [Events]

  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krw, usd, krwPrice, usdPrice]);

  useEffect(() => {
    dropdownRef.current?.close();
  }, [focusCurrency]);

  // endregion


  // region [Left Action]

  const BtcLeftAction = useMemo(() => {

    if (focusCurrency !== "BTC") {
      return;
    }
    if (["0", ""].includes(btcCount)) {
      return null;
    }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeBtcCount} style={{ padding: "6px" }} />);
  }, [focusCurrency, btcCount]);

  const KrwLeftAction = useMemo(() => {

    if (focusCurrency !== "KRW") {
      return;
    }
    if (["0", ""].includes(krw)) {
      return null;
    }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeKrw} style={{ padding: "6px" }} />);
  }, [focusCurrency, krw]);

  const UsdLeftAction = useMemo(() => {

    if (focusCurrency !== "USD") {
      return;
    }
    if (["0", ""].includes(usd)) {
      return null;
    }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeUsd} style={{ padding: "6px" }} />);
  }, [focusCurrency, usd]);

  // endregion


  // region [templates]

  const SatValue = useMemo(() => (
    (BigInt(Math.floor(parseFloat(btcCount) * 100000000)) * 1n).toLocaleString()
  ), [btcCount]);


  const SelectUnitList = useMemo(() => {

    const filteredList = unitList.filter(unit => unit !== focusCurrency);

    return (
      <ul className="select-unit__list">
        {filteredList.map((unit) => (
          <li key={unit} className="select-unit__list__item">
            <button className="select-unit__list__item__button" type="button"
                    onClick={() => { setFocusCurrency(unit); }}>{unit}</button>
          </li>)
        )}
      </ul>
    );
  }, [unitList, focusCurrency]);


  const NumberFieldIUnit = useCallback((unit: UnitType) => {

    if (focusCurrency !== unit) {
      return unit;
    }

    return (
      <KDropHolder content={SelectUnitList} position="top-right" offset="12px">
        <div className="focus-unit__area">
          {focusCurrency} <KIcon className="focus-unit__area__icon" icon="keyboard_arrow_down" size={12} />
        </div>
      </KDropHolder>
    );
  }, [focusCurrency, SelectUnitList]);


  const KrwNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={krwRef} className="convert-pannel__item__input" value={krw} readonly={focusCurrency !== "KRW"}
                   dataCopy={krw} unit={NumberFieldIUnit("KRW")} maxLength={15} onChange={onChangeKrw}
                   onClick={onClickCopyToKrw} leftAction={KrwLeftAction} />
      <span className="convert-pannel__item__sub-text">1BTC /
        <CountText value={krwPrice} /> <span className="krw">KRW</span>
      </span>
    </div>
  ), [krw, krwPrice, NumberFieldIUnit, focusCurrency]);


  const UsdNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={usdRef} className="convert-pannel__item__input" value={usd} readonly={focusCurrency !== "USD"}
                   dataCopy={usd} unit={NumberFieldIUnit("USD")} maxLength={15} onChange={onChangeUsd}
                   onClick={onClickCopyToUsd} leftAction={UsdLeftAction} />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={usdPrice} /> USD</span>
    </div>
  ), [usd, usdPrice, NumberFieldIUnit, focusCurrency]);


  const BtcNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={btcCountInputRef} className="convert-pannel__item__input" value={btcCount}
                   readonly={focusCurrency !== "BTC"}
                   dataCopy={btcCount} unit={NumberFieldIUnit("BTC")} maxLength={15} onChange={onChangeBtcCount}
                   onClick={onClickCopyToBtc} leftAction={BtcLeftAction} />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <span ref={satRef} className="convert-pannel__item__sub-text" data-copy={SatValue} onClick={onClickCopyToSat}>
        {btcCount}
        BTC / {SatValue} Sats
      </span>
    </div>
  ), [btcCount, NumberFieldIUnit, focusCurrency]);


  const SortNumberField = useMemo(() => {

    const unitOrder = (["BTC", "KRW", "USD"] as UnitType[]).filter(unit => unit !== focusCurrency);

    if (focusCurrency !== null) {
      unitOrder.push(focusCurrency);
    }

    const fieldMap: Record<string, React.ReactNode> = {
      BTC: BtcNumberField,
      KRW: currency.includes("KRW") ? KrwNumberField : null,
      USD: currency.includes("USD") ? UsdNumberField : null
    };

    return (<>{unitOrder.map(unit => (<Fragment key={unit}>{fieldMap[unit]}</Fragment>))}</>);
  }, [focusCurrency, currency, BtcNumberField, KrwNumberField, UsdNumberField]);

  // endregion


  return (
    <div className="convert-pannel">
      {SortNumberField}
    </div>
  );
};

export default memo(ConvertPannel);
