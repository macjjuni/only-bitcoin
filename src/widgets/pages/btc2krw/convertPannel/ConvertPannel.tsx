import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { KIcon } from "kku-ui";
import { CountText, NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import "./ConvertPannel.scss";


type UnitType = "BTC" | "USD" | "KRW";


const ConvertPannel = () => {

  // region [Hooks]

  const currency = useStore(state => state.setting.currency)
  const krwPrice = useStore(state => state.bitcoinPrice.krw);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);

  const [btcCount, setBtcCount] = useState("1");

  const [krw, setKrw] = useState("0");
  const [usd, setUsd] = useState("0");

  const [focusUnit, setFocusUnit] = useState<UnitType>("BTC");

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

  const initializeBtcCount = useCallback(() => { setBtcCount("0"); }, []);

  // endregion


  // region [Events]

  const onChangeUsd = useCallback(setUsd, []);
  const onChangeKrw = useCallback(setKrw, []);
  const onChangeBtcCount = useCallback(setBtcCount, []);

  // endregion


  // region [Templates]



  const BtcLeftAction = useMemo(() => {

    if (["0", ""].includes(btcCount)) { return null; }

    return (<KIcon icon="close" color="#fff" size={32} onClick={initializeBtcCount} style={{ padding: "6px" }} />);
  }, [btcCount]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krwPrice, usdPrice]);

  // endregion


  // region [templates]

  const KrwNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField className="convert-pannel__item__input" value={krw} onChange={onChangeKrw} unit="KRW" readonly />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={krwPrice} /> KRW</span>
    </div>
  ), [krw, krwPrice]);

  const UsdNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField className="convert-pannel__item__input" value={usd} onChange={onChangeUsd} unit="USD" readonly />
      <span className="convert-pannel__item__sub-text">1BTC / <CountText value={usdPrice} /> USD</span>
    </div>
  ), [usd, usdPrice]);

  const BtcNumberField = useMemo(() => (
    <div className="convert-pannel__item">
      <NumberField className="convert-pannel__item__input" value={btcCount} onChange={onChangeBtcCount} unit="BTC"
                   leftAction={BtcLeftAction} />
    </div>
  ), [btcCount, BtcLeftAction]);

  // endregion


  return (
    <div className="convert-pannel">
      {currency.includes('KRW') && KrwNumberField}
      {currency.includes('USD') && UsdNumberField}
      {BtcNumberField}
    </div>
  );
};

export default memo(ConvertPannel);
