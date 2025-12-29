import { memo, useCallback, useEffect, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { comma, extractNumbers } from "@/shared/utils/string";
import { UnitType } from "@/shared/stores/store.interface";
import { btcToSatoshi, floorToDecimal } from "@/shared/utils/number";
import { ConvertCard } from "@/pages/btc2fiatPage/components";


const ConvertPanel = () => {

  // region [Hooks]
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
  const onChangeUnit = useCallback((unit: UnitType) => {
    setFocusCurrency(unit);
    resetPremium();
  }, []);
  // endregion


  // region [Life Cycles]
  useEffect(synchronizeValue, [btcCount, krw, usd, krwPrice, usdPrice, sats, premium]);
  // endregion


  const KrwNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "KRW";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = isCurrentCurrency ? krw : calcPremium(krw, "KRW"); // readonly일 때만 프리미엄 적용
    const incrementValue = calcStringNumber(displayValue, krw, 0);

    return (
      <ConvertCard inputActive={isCurrentCurrency} title="KRW(₩):" value={displayValue} unit="KRW"
                   onChange={onChangeKrw} onChangeUnit={onChangeUnit} isPremium={isShowPremiumExpression}
                   topDescription={`${incrementValue}(Premium) + ${krw}`} bottomDescription={`1BTC = ${krwPrice}`} />
    );
  }, [krw, krwPrice, focusCurrency, calcPremium, premium, onChangeKrw, onChangeUnit]);


  const UsdNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "USD";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = isCurrentCurrency ? usd : calcPremium(usd, "USD");
    const incrementValue = calcStringNumber(displayValue, usd);

    return (
      <ConvertCard inputActive={isCurrentCurrency} title="USD($):" value={displayValue}
                   onChange={onChangeUsd} onChangeUnit={onChangeUnit} unit="USD" isPremium={isShowPremiumExpression}
                   topDescription={`${incrementValue}(Premium) + ${usd}`}
                   bottomDescription={`1${isUsdtStandard ? "USDT" : "USD"} : ${exRate} | 1BTC = ${usd}`} />
    );
  }, [usd, usdPrice, focusCurrency, exRate, calcPremium, premium, onChangeUsd, onChangeUnit]);

  const BtcNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "BTC";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = isCurrentCurrency ? btcCount : calcPremium(btcCount, "BTC");
    const incrementValue = calcStringNumber(displayValue, btcCount, 8);

    return (
      <ConvertCard inputActive={isCurrentCurrency} title="BTC(₿):" value={displayValue} unit="BTC"
                   onChange={onChangeBtcCount} onChangeUnit={onChangeUnit} isPremium={isShowPremiumExpression}
                   topDescription={`${incrementValue} + ${btcCount}`} bottomDescription="1BTC = 100,000,000" />
    );
  }, [btcCount, focusCurrency, calcPremium, premium, onChangeBtcCount, onChangeUnit]);

  const SatsNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "SATS";
    const isShowPremiumExpression = !isCurrentCurrency && premium !== 0;
    const displayValue = focusCurrency === "SATS" ? sats : calcPremium(sats, "SATS");
    const incrementValue = calcStringNumber(displayValue, sats, 0);

    return (
      <ConvertCard inputActive={isCurrentCurrency} title="Sats:" value={displayValue} unit="SATS"
                   onChange={onChangeSats} onChangeUnit={onChangeUnit} isPremium={isShowPremiumExpression}
                   topDescription={`${incrementValue}(Premium) + ${sats}`} bottomDescription="1BTC = 100,000,000" />
    );
  }, [sats, focusCurrency, calcPremium, premium, onChangeSats, onChangeUnit]);


  const SortNumberField = useMemo(() => {

    if (["BTC", "SATS"].includes(focusCurrency)) {

      return (
        <>
          <div className="flex flex-col gap-3">
            {focusCurrency === "BTC" ? null : BtcNumberField}
            {KrwNumberField}
            {UsdNumberField}
            {focusCurrency === "BTC" ? SatsNumberField : null}
          </div>
          {focusCurrency === "BTC" ? BtcNumberField : SatsNumberField}
        </>
      );
    }

    if (focusCurrency === "KRW") {
      return (
        <>
          <div className="flex flex-col gap-3">
            {BtcNumberField}
            {SatsNumberField}
            {UsdNumberField}
          </div>
          {KrwNumberField}
        </>
      );
    }

    if (focusCurrency === "USD") {
      return (
        <>
          <div className="flex flex-col gap-3">
            {BtcNumberField}
            {SatsNumberField}
            {KrwNumberField}
          </div>
          {UsdNumberField}
        </>
      );
    }
  }, [focusCurrency, BtcNumberField, KrwNumberField, UsdNumberField, SatsNumberField]);
  // endregion


  return (<div className="flex flex-col justify-between gap-2 h-full">{SortNumberField}</div>);
};


const MemoizedConvertPanel = memo(ConvertPanel);
MemoizedConvertPanel.displayName = "MemoizedConvertPanel";

export default MemoizedConvertPanel;
