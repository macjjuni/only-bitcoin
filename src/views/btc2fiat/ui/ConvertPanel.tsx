"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useMounted } from "@/shared/lib/hooks";
import useSettingStore from "@/shared/stores/settingStore";
import { btcToSatoshi, floorToDecimal } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import useBtc2FiatStore, { type UnitType } from "../model/btc2FiatStore";
import ConvertCard from "./ConvertCard";

const ConvertPanel = () => {
  // region [Hooks]
  const krwPrice = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const usdPrice = useBitcoinStore((state) => state.bitcoinPrice.usd);
  const exRate = useBitcoinStore((state) => state.exRate.value);
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);

  const btcCount = useBtc2FiatStore((state) => state.btc2Fiat.btcCount);
  const krw = useBtc2FiatStore((state) => state.btc2Fiat.krw);
  const usd = useBtc2FiatStore((state) => state.btc2Fiat.usd);
  const sats = useBtc2FiatStore((state) => state.btc2Fiat.sats);
  const setBtcCount = useBtc2FiatStore((state) => state.setBtcCount);
  const setKrw = useBtc2FiatStore((state) => state.setKrw);
  const setUsd = useBtc2FiatStore((state) => state.setUsd);
  const setSats = useBtc2FiatStore((state) => state.setSats);
  const premium = useBtc2FiatStore((state) => state.premium);
  const setPremium = useBtc2FiatStore((state) => state.setPremium);

  const focusCurrency = useBtc2FiatStore((state) => state.focusCurrency);
  const setFocusCurrency = useBtc2FiatStore((state) => state.setFocusCurrency);

  const isMounted = useMounted();
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

    if (focusCurrency === "SATS") {
      const satsNum = parseFloat(sats.replace(/,/g, ""));
      const btcCountNum = satsNum / 100_000_000;
      const usdFromBtcCount = floorToDecimal(premiumUsdPrice * btcCountNum, 2);

      setUsd(comma(usdFromBtcCount, false));
      setKrw(comma(premiumKrwPrice * btcCountNum));
      setBtcCount(satoshiFormatter(satsNum));
    }

    if (focusCurrency === "KRW") {
      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcFromKrw = krwNum / premiumKrwPrice;

      setUsd(comma(floorToDecimal((krwNum / premiumKrwPrice) * premiumUsdPrice, 2), false));
      setBtcCount(btcFormatter(btcFromKrw));
      setSats(btcToSatoshi(btcFromKrw));
    }

    if (focusCurrency === "USD") {
      const usdNum = parseFloat(usd.replace(/,/g, ""));
      const btcFromUsd = usdNum / premiumUsdPrice;

      setKrw(comma(btcFromUsd * premiumKrwPrice));
      setBtcCount(btcFormatter(btcFromUsd));
      setSats(btcToSatoshi(btcFromUsd));
    }
  }, [
    focusCurrency,
    btcCount,
    sats,
    krw,
    usd,
    premium,
    krwPrice,
    usdPrice,
    setUsd,
    setKrw,
    setSats,
    setBtcCount,
    btcFormatter,
    satoshiFormatter,
  ]);
  // endregion

  // region [Events]
  const onChangeBtcCount = useCallback(
    (val: string) => {
      setBtcCount(val);
      setFocusCurrency("BTC");
    },
    [setBtcCount, setFocusCurrency],
  );

  const onChangeSats = useCallback(
    (val: string) => {
      setSats(val);
      setFocusCurrency("SATS");
    },
    [setSats, setFocusCurrency],
  );

  const onChangeKrw = useCallback(
    (val: string) => {
      setKrw(val);
      setFocusCurrency("KRW");
    },
    [setKrw, setFocusCurrency],
  );

  const onChangeUsd = useCallback(
    (val: string) => {
      setUsd(val);
      setFocusCurrency("USD");
    },
    [setUsd, setFocusCurrency],
  );

  const onChangeUnit = useCallback(
    (unit: UnitType) => {
      if (unit === "BTC") {
        setFocusCurrency("BTC");
      }
      if (unit === "SATS") {
        setFocusCurrency("SATS");
      }
      if (unit === "KRW") {
        setFocusCurrency("KRW");
      }
      if (unit === "USD") {
        setFocusCurrency("USD");
      }
    },
    [setFocusCurrency],
  );
  // endregion

  // region [Life Cycles]
  // 1. 값 변경 대응을 위한 동기화 감시
  useEffect(() => {
    /**
     * zustand는 `useSyncExternalStore`의 서버 스냅샷으로 스토어의 초기값을 넘긴다.
     * 그래서 React 하이드레이션 렌더에서는 persist로 복원된 값이 아니라 기본값
     * (btcCount "1", focusCurrency "BTC")이 보인다. 이 시점에 동기화를 돌리면
     * 기본값 기준으로 계산된 값이 복원된 사용자 입력을 덮어쓴다.
     * 마운트가 끝나 실제 스토어 값을 읽을 수 있을 때부터 동기화한다.
     */
    if (!isMounted) {
      return;
    }
    synchronizeValue();
  }, [isMounted, synchronizeValue]);

  // 2. 외부 데이터 변동 및 프리미엄 소수점 대응
  useEffect(() => {
    // 0 이하 프리미엄 방지
    if (premium < 0) {
      setPremium(0);
    }
  }, [premium, setPremium]);
  // endregion

  // region [memos]
  const KrwNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "KRW";
    const premiumAmount = Math.floor(krwPrice * (premium / 100));

    let topDescription;
    if (premium !== 0 && focusCurrency !== "USD") {
      topDescription = (
        <>
          <span>{comma(krwPrice)}</span>
          <span className="mx-1">+</span>
          <span className="text-bitcoin font-bold">
            {comma(premiumAmount)}({premium}%)
          </span>
        </>
      );
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="KRW(₩):"
        value={krw}
        unit="KRW"
        onChange={onChangeKrw}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== "USD" && premium !== 0}
        topDescription={topDescription}
        bottomDescription={`₩${comma(exRate)} = 1$`}
      />
    );
  }, [krw, krwPrice, focusCurrency, premium, onChangeKrw, onChangeUnit, exRate]);

  const UsdNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "USD";
    const premiumAmount = floorToDecimal(usdPrice * (premium / 100), 2);

    let topDescription;
    if (premium !== 0 && focusCurrency !== "KRW") {
      topDescription = (
        <>
          <span>{comma(usdPrice)}</span>
          <span className="mx-1">+</span>
          <span className="text-bitcoin font-bold">
            {comma(premiumAmount)}({premium}%)
          </span>
        </>
      );
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="USD($):"
        value={usd}
        unit="USD"
        onChange={onChangeUsd}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== "KRW" && premium !== 0}
        topDescription={topDescription}
        bottomDescription={`1${isUsdtStandard ? "USDT" : "USD"} = ₩${comma(exRate)}`}
      />
    );
  }, [usd, usdPrice, focusCurrency, exRate, premium, isUsdtStandard, onChangeUsd, onChangeUnit]);

  const BtcNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "BTC";

    let topDescription;
    if (premium !== 0 && focusCurrency === "KRW") {
      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const btcCountWithoutPremium = krwNum / krwPrice;
      const btcCountWithPremium = parseFloat(btcCount.replace(/,/g, ""));
      const btcDifference = btcCountWithoutPremium - btcCountWithPremium;

      topDescription = (
        <>
          <span>{btcFormatter(btcCountWithoutPremium)}</span>
          <span className="mx-1">-</span>
          <span className="text-bitcoin">
            {btcFormatter(btcDifference)}({premium}%)
          </span>
        </>
      );
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
          <span className="text-bitcoin">
            {btcFormatter(btcDifference)}({premium}%)
          </span>
        </>
      );
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="BTC(₿):"
        value={btcCount}
        unit="BTC"
        onChange={onChangeBtcCount}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== "SATS" && premium !== 0}
        topDescription={topDescription}
        bottomDescription="1BTC = 1BTC"
      />
    );
  }, [
    btcCount,
    focusCurrency,
    premium,
    onChangeBtcCount,
    onChangeUnit,
    krw,
    krwPrice,
    usd,
    usdPrice,
    btcFormatter,
  ]);

  const SatsNumberField = useMemo(() => {
    const isCurrentCurrency = focusCurrency === "SATS";

    let topDescription;
    if (premium !== 0 && focusCurrency === "KRW") {
      const krwNum = parseFloat(krw.replace(/,/g, ""));
      const satsWithoutPremium = parseFloat(btcToSatoshi(krwNum / krwPrice).replace(/,/g, ""));
      const satsWithPremium = parseFloat(sats.replace(/,/g, ""));
      const satsDifference = satsWithoutPremium - satsWithPremium;

      topDescription = (
        <>
          <span>{comma(satsWithoutPremium)}</span>
          <span className="mx-1">-</span>
          <span className="text-bitcoin">
            {comma(satsDifference)}({premium}%)
          </span>
        </>
      );
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
          <span className="text-bitcoin">
            {comma(satsDifference)}({premium}%)
          </span>
        </>
      );
    }

    return (
      <ConvertCard
        inputActive={isCurrentCurrency}
        title="Sats:"
        value={sats}
        unit="SATS"
        onChange={onChangeSats}
        onChangeUnit={onChangeUnit}
        isPremium={focusCurrency !== "BTC" && premium !== 0}
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
