import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KIcon } from "kku-ui";
import { CountText, NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { useCopyOnClick } from "@/shared/hooks";
import storageUitl from "@/shared/utils/storage"
import "./ConvertPannel.scss";


type UnitType = "BTC" | "USD" | "KRW";

const BTC_COUNT_KEY = "BTC_COUNT_KEY" as const;


const ConvertPannel = () => {

  // region [Hooks]

  const krwRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const satRef = useRef<HTMLInputElement>(null);

  const { onClickCopy: onClickCopyToKrw } = useCopyOnClick(krwRef);
  const { onClickCopy: onClickCopyToUsd } = useCopyOnClick(usdRef);
  const { onClickCopy: onClickCopyToSat } = useCopyOnClick(satRef);


  const currency = useStore(state => state.setting.currency);
  const krwPrice = useStore(state => state.bitcoinPrice.krw);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);

  const [btcCount, setBtcCount] = useState("1");

  const [krw, setKrw] = useState("0");
  const [usd, setUsd] = useState("0");

  const [focusUnit] = useState<UnitType>("BTC");

  // endregion


  // region [Privates]

  const synchronizeValue = useCallback(() => {

    const btcCountNum = parseFloat(btcCount.replace(/,/g, ""));

    if (focusUnit === "BTC") {
      const intUsdPrice = Math.floor(usdPrice * btcCountNum);
      setUsd(comma(intUsdPrice));

      const intKrwPrice = Math.floor(krwPrice * btcCountNum);
      setKrw(comma(intKrwPrice));
    }
    // if (focusUnit === "KRW") {}

  }, [focusUnit, btcCount, krwPrice, usdPrice]);

  const initializeBtcCount = useCallback(() => {
    setBtcCount("0");
  }, []);

  const initializeStorageData = useCallback(() => {

    const btcCountInStorage = storageUitl.getItem(BTC_COUNT_KEY) as string;

    if (btcCountInStorage) {
      setBtcCount(btcCountInStorage);
    }
  }, []);

  const saveStorage = useCallback((value: string) => {
    storageUitl.setItem(BTC_COUNT_KEY, value);
  }, []);

  // endregion


  // region [Events]

  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);

  // endregion


  // region [Templates]

  const BtcLeftAction = useMemo(() => {

    if (["0", ""].includes(btcCount)) {
      return null;
    }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeBtcCount} style={{ padding: "6px" }} />);
  }, [btcCount]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    initializeStorageData();
  }, []);

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krwPrice, usdPrice]);

  useEffect(() => {
    saveStorage(btcCount);
  }, [btcCount]);

  // endregion


  // region [templates]

  const SatValue = useMemo(() => (
    (BigInt(Math.floor(parseFloat(btcCount) * 100000000)) * 1n).toLocaleString()
  ), [btcCount]);

  const KrwNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={krwRef} className="convert-pannel__item__input clickable" value={krw} onChange={onChangeKrw}
                   dataCopy={krw} unit="KRW" readonly onClick={onClickCopyToKrw} />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={krwPrice} /> KRW</span>
    </div>
  ), [krw, krwPrice]);

  const UsdNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField ref={usdRef} className="convert-pannel__item__input clickable" value={usd} onChange={onChangeUsd}
                   dataCopy={usd} unit="USD" readonly onClick={onClickCopyToUsd} />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={usdPrice} /> USD</span>
    </div>
  ), [usd, usdPrice]);

  const BtcNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField className="convert-pannel__item__input btc-count__number-field" value={btcCount} onChange={onChangeBtcCount} unit="BTC"
                   leftAction={BtcLeftAction} maxLength={15} />
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
      <span ref={satRef} className="convert-pannel__item__sub-text" data-copy={SatValue} onClick={onClickCopyToSat}>
        {btcCount}
        BTC / {SatValue}Sats
      </span>
    </div>
  ), [btcCount, BtcLeftAction]);

  // endregion


  return (
    <div className="convert-pannel">
      {currency.includes("KRW") && KrwNumberField}
      {currency.includes("USD") && UsdNumberField}
      {BtcNumberField}
    </div>
  );
};

export default memo(ConvertPannel);
