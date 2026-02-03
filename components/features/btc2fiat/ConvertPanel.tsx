'use client';

import { memo, useCallback, useEffect, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { UnitType } from "@/shared/stores/store.interface";
import { btcToSatoshi, floorToDecimal } from "@/shared/utils/number";
import { ConvertCard } from "@/components/features/btc2fiat";


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

    // Premium이 적용된 BTC 가격 계산
    const premiumKrwPrice = krwPrice * (1 + premium / 100);
    const premiumUsdPrice = usdPrice * (1 + premium / 100);

    if (focusCurrency === "BTC") {

      const btcCountNum = parseFloat(btcCount.replace(/,/g, ""));
      const usdFromBtcCount = floorToDecimal(premiumUsdPrice * btcCountNum, 2);

      setUsd(comma(usdFromBtcCount, false));
      setKrw(comma(premiumKrwPrice * btcCountNum));
      setSats(btcToSatoshi(btcCountNum));
    }

    if (focusCurrency === "KRW") {

      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountFromKrw = floorToDecimal(krwNum / premiumKrwPrice, 8);
      const usdFromKrw = (krwNum / exRate).toFixed(2);

      setBtcCount(comma(btcFormatter(btcCountFromKrw)));
      setUsd(Number(usdFromKrw) === 0 ? "0" : comma(usdFromKrw));
      setSats(btcToSatoshi(krwNum / premiumKrwPrice));
    }

    if (focusCurrency === "USD") {

      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcCountFromUsd = floorToDecimal(usdNum / premiumUsdPrice, 8);

      setBtcCount(btcFormatter(btcCountFromUsd));
      setKrw(comma(Math.floor(usdNum * exRate)));
      setSats(btcToSatoshi(btcCountFromUsd));
    }

    if (focusCurrency === "SATS") {

      const satsNum = parseFloat(sats.replace(/,/g, ""));
      const btcCountNum = satoshiFormatter(satsNum);
      const usdFromBtcCount = floorToDecimal(premiumUsdPrice * Number(btcCountNum), 2);

      setKrw(comma(premiumKrwPrice * Number(btcCountNum)));
      setUsd(comma(usdFromBtcCount, false));
      setBtcCount(Number(btcCountNum) === 0 ? "0" : comma(btcCountNum));
    }

  }, [focusCurrency, btcCount, krw, usd, sats, krwPrice, usdPrice, exRate, premium]);

  const resetPremium = useCallback(() => {
    setPremium(0);
  }, [setPremium]);
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
  useEffect(synchronizeValue, [synchronizeValue]);
  // endregion


  const KrwNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "KRW";
    const premiumAmount = Math.floor(krwPrice * (premium / 100));

    let topDescription = undefined;
    if (premium !== 0 && focusCurrency !== "USD") {
      topDescription = (
        <>
          <span>{comma(krwPrice)}</span>
          <span className="mx-1">+</span>
          <span className="text-bitcoin font-bold">
            {comma(premiumAmount)}({premium}%)
          </span>
        </>
      )
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="KRW(₩):"
        value={krw}
        unit="KRW"
        onChange={onChangeKrw}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== 'USD' && premium !== 0}
        topDescription={topDescription}
        bottomDescription={`1BTC = ${comma(krwPrice)} ${focusCurrency === 'USD' && `| 1$ = ₩${comma(exRate)}`}`}
      />
    );
  }, [krw, krwPrice, focusCurrency, premium, onChangeKrw, onChangeUnit, exRate]);


  const UsdNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "USD";
    const premiumAmount = floorToDecimal(usdPrice * (premium / 100), 2);

    let topDescription = undefined;
    if (premium !== 0 && focusCurrency !== "KRW") {
      topDescription = (
        <>
          <span>{comma(usdPrice)}</span>
          <span className="mx-1">+</span>
          <span className="text-bitcoin font-bold">
            {comma(premiumAmount)}({premium}%)
          </span>
        </>
      )
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="USD($):"
        value={usd}
        unit="USD"
        onChange={onChangeUsd}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== 'KRW' && premium !== 0}
        topDescription={topDescription}
        bottomDescription={`1BTC = ${comma(usdPrice)} | 1${isUsdtStandard ? "USDT" : "USD"} : ${comma(exRate)}`}
      />
    );
  }, [usd, usdPrice, focusCurrency, exRate, premium, isUsdtStandard, onChangeUsd, onChangeUnit]);

  const BtcNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "BTC";

    let topDescription = undefined;
    if (premium !== 0 && focusCurrency === "KRW") {
      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountWithoutPremium = krwNum / krwPrice;
      const btcCountWithPremium = parseFloat(btcCount.replace(/,/g, ""));
      const btcDifference = btcCountWithoutPremium - btcCountWithPremium;

      topDescription = (
        <>
          <span>{btcFormatter(btcCountWithoutPremium)}</span>
          <span className="mx-1">-</span>
          <span className="text-bitcoin">{btcFormatter(btcDifference)}({premium}%)</span>
        </>
      )
    }

    if (premium !== 0 && focusCurrency === "USD") {
      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcCountWithoutPremium = usdNum / usdPrice;
      const btcCountWithPremium = parseFloat(btcCount.replace(/,/g, ""));
      const btcDifference = btcCountWithoutPremium - btcCountWithPremium;

      topDescription = (
        <>
          <span>{btcFormatter(btcCountWithoutPremium)}</span>
          <span className="mx-1">-</span>
          <span className="text-bitcoin">{btcFormatter(btcDifference)}({premium}%)</span>
        </>
      )
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="BTC(₿):"
        value={btcCount}
        unit="BTC"
        onChange={onChangeBtcCount}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== 'SATS' && premium !== 0}
        topDescription={topDescription}
        bottomDescription="1BTC = 1BTC"
      />
    );
  }, [btcCount, focusCurrency, premium, onChangeBtcCount, onChangeUnit, krw, krwPrice, usd, usdPrice, btcFormatter]);

  const SatsNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "SATS";

    let topDescription = undefined;
    if (premium !== 0 && focusCurrency === "KRW") {
      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const satsWithoutPremium = parseFloat(btcToSatoshi(krwNum / krwPrice).replace(/,/g, ""));
      const satsWithPremium = parseFloat(sats.replace(/,/g, ""));
      const satsDifference = satsWithoutPremium - satsWithPremium;

      topDescription = (
        <>
          <span>{comma(satsWithoutPremium)}</span>
          <span className="mx-1">-</span>
          <span className="text-bitcoin">{comma(satsDifference)}({premium}%)</span>
        </>
      )
    }

    if (premium !== 0 && focusCurrency === "USD") {
      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const satsWithoutPremium = parseFloat(btcToSatoshi(usdNum / usdPrice).replace(/,/g, ""));
      const satsWithPremium = parseFloat(sats.replace(/,/g, ""));
      const satsDifference = satsWithoutPremium - satsWithPremium;

      topDescription = (
        <>
            <span>{comma(satsWithoutPremium)}</span>
            <span className="mx-1">-</span>
            <span className="text-bitcoin">{comma(satsDifference)}({premium}%)</span>
        </>
      )
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="Sats:"
        value={sats}
        unit="SATS"
        onChange={onChangeSats}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== 'BTC' && premium !== 0}
        topDescription={topDescription}
        bottomDescription="1BTC = 100,000,000 Sats"
      />
    );
  }, [sats, focusCurrency, premium, onChangeSats, onChangeUnit, krw, krwPrice, usd, usdPrice]);


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


  return (
    <div className="flex flex-col justify-between gap-2 h-full layout-max:h-full">
      {SortNumberField}
    </div>
  );
};


const MemoizedConvertPanel = memo(ConvertPanel);
MemoizedConvertPanel.displayName = "MemoizedConvertPanel";

export default MemoizedConvertPanel;
