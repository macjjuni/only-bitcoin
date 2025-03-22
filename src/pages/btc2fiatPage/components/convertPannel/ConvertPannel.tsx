import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { KDropHolder, KDropHolderRefs, KIcon } from "kku-ui";
import { CountText, NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { useCopyOnClick } from "@/shared/hooks";
import { UnitType } from "@/shared/stores/store.interface";
import { btcToSatoshi, floorToDecimal } from "@/shared/utils/number";
import "./ConvertPannel.scss";


const ConvertPannel = () => {

  // region [Hooks]

  const btcCountInputRef = useRef<HTMLInputElement>(null);
  const krwRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const satsRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<KDropHolderRefs>(null);

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

  const focusCurrency = useStore(state => state.focusCurrency);
  const setFocusCurrency = useStore(state => state.setFocusCurrency);

  const unitList = useMemo(() => ["BTC"].concat(currency.split("/")).concat("SATS"), [currency]) as UnitType[];

  // endregion


  // region [Privates]

  const btcFormatter = useCallback((btcNum: number) => {

    if (btcNum < 1e-8) { return "0"; }
    return btcNum.toFixed(8).replace(/\.?0+$/, ""); // 숫자 뒤에 0 제거 정규식
  }, []);

  const satoshiFormatter = useCallback((satoshi: number) => {
    if (satoshi < 1) { return "0"; }
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

  // endregion


  // region [Events]

  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);
  const onChangeSats = useCallback(setSats, []);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krw, usd, krwPrice, usdPrice, sats]);

  useEffect(() => {
    dropdownRef.current?.close();
  }, [focusCurrency]);

  // endregion


  // region [Left Action]

  const BtcLeftAction = useMemo(() => {

    if (focusCurrency !== "BTC") { return; }
    if (["0", ""].includes(btcCount)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeBtcCount} style={{ padding: "6px" }} />);
  }, [focusCurrency, btcCount]);

  const SatsLeftAction = useMemo(() => {

    if (focusCurrency !== "SATS") { return; }
    if (["0", ""].includes(sats)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeSats} style={{ padding: "6px" }} />);
  }, [focusCurrency, sats]);

  const KrwLeftAction = useMemo(() => {

    if (focusCurrency !== "KRW") { return; }
    if (["0", ""].includes(krw)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeKrw} style={{ padding: "6px" }} />);
  }, [focusCurrency, krw]);

  const UsdLeftAction = useMemo(() => {

    if (focusCurrency !== "USD") { return; }
    if (["0", ""].includes(usd)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeUsd} style={{ padding: "6px" }} />);
  }, [focusCurrency, usd]);

  // endregion


  // region [templates]

  const SelectUnitList = useMemo(() => {

    const filteredList = unitList.filter(unit => unit !== focusCurrency);

    return (
      <ul className="select-unit__list">
        {filteredList.map((unit) => (
          <li key={unit} className="select-unit__list__item">
            <button className="select-unit__list__item__button" type="button"
                    onClick={() => { setFocusCurrency(unit); }}>
              {unit === 'SATS' ? 'Sats' : unit}
            </button>
          </li>
        ))}
      </ul>
    );
  }, [unitList, focusCurrency]);


  const NumberFieldIUnit = useCallback((unit: UnitType) => {

    if (focusCurrency !== unit) { return unit === "SATS" ? "Sats" : unit; }

    return (
      <KDropHolder content={SelectUnitList} position="top-center" offset="8px" className="select-unit__list">
        <div className={`focus-unit__area focus-unit__area--${focusCurrency.toLowerCase()}`}>
          {focusCurrency === "SATS" ? "Sats" : focusCurrency}
          <KIcon className="focus-unit__area__icon" icon="keyboard_arrow_down" size={10} />
        </div>
      </KDropHolder>
    );
  }, [focusCurrency, SelectUnitList]);


  const KrwNumberField = useMemo(() => (
    <div className="convert-pannel__item convert-pannel__item--krw">
      <NumberField ref={krwRef} className="convert-pannel__item__input" value={krw} readonly={focusCurrency !== "KRW"}
                   dataCopy={krw} unit={NumberFieldIUnit("KRW")} maxLength={15} onChange={onChangeKrw}
                   onClick={onClickCopyToKrw} leftAction={KrwLeftAction} />
      <span className="convert-pannel__item__sub-text">
        1BTC
        {` / `}
        <CountText value={krwPrice} /> <span className="krw">KRW</span>
      </span>
    </div>
  ), [krw, krwPrice, NumberFieldIUnit, focusCurrency]);


  const UsdNumberField = useMemo(() => (
    <div className="convert-pannel__item convert-pannel__item--usd">
      <NumberField ref={usdRef} className="convert-pannel__item__input" value={usd} readonly={focusCurrency !== "USD"}
                   dataCopy={usd} unit={NumberFieldIUnit("USD")} maxLength={15} onChange={onChangeUsd}
                   onClick={onClickCopyToUsd} leftAction={UsdLeftAction} />
      <span className="convert-pannel__item__sub-text">
        {isUsdtStandard ? "1USDT" : "$1"} / ₩{exRate}
        {` | `}
        1BTC / <CountText value={usdPrice} /> USD
      </span>
    </div>
  ), [usd, usdPrice, NumberFieldIUnit, focusCurrency, exRate]);


  const BtcNumberField = useMemo(() => (
    <div className="convert-pannel__item convert-pannel__item--btc">
      <NumberField ref={btcCountInputRef} className="convert-pannel__item__input" value={btcCount}
                   readonly={focusCurrency !== "BTC"}
                   dataCopy={btcCount} unit={NumberFieldIUnit("BTC")} maxLength={15} onChange={onChangeBtcCount}
                   onClick={onClickCopyToBtc} leftAction={BtcLeftAction} />
    </div>
  ), [btcCount, NumberFieldIUnit, focusCurrency]);


  const SatsNumberField = useMemo(() => (
    <div className="convert-pannel__item convert-pannel__item--sats">
      <NumberField ref={satsRef} className="convert-pannel__item__input" value={sats}
                   readonly={focusCurrency !== "SATS"}
                   dataCopy={sats} unit={NumberFieldIUnit("SATS")} maxLength={15} onChange={onChangeSats}
                   onClick={onClickCopyToSats} leftAction={SatsLeftAction} />
    </div>
  ), [sats, SatsLeftAction]);


  const SortNumberField = useMemo(() => {

    if (["BTC", "SATS"].includes(focusCurrency)) {

      return (
        <>
          {focusCurrency === "BTC" ? null :BtcNumberField}
          {KrwNumberField}
          {UsdNumberField}
          {focusCurrency === "BTC" ? SatsNumberField :null}
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
    <div className="convert-pannel">
      {SortNumberField}
    </div>
  );
};

export default memo(ConvertPannel);
