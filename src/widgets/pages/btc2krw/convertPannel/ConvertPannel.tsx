import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { KIcon } from "kku-ui";
import { NumberField } from "@/widgets";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import "./ConvertPannel.scss";


type UnitType = "BTC" | "USD" | "KRW";


const ConvertPannel = () => {

  // region [Hooks]

  const krwPrice = useStore(state => state.bitcoinPrice.krw);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);

  const [krw, setKrw] = useState("0");
  const [usd, setUsd] = useState("0");
  const [btcCount, setBtcCount] = useState("1");

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
    return (<KIcon icon="close" color="#fff" size={24} onClick={() => {
      setBtcCount("0");}} style={{padding: '4px'}} />);
  }, [btcCount]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    synchronizeValue();
  }, [btcCount, krwPrice, usdPrice]);

  // endregion


  return (
    <div className="convert-pannel">
      <NumberField className="convert-pannel__input" value={krw} onChange={onChangeKrw} unit="KRW" readonly />
      <NumberField className="convert-pannel__input" value={usd} onChange={onChangeUsd} unit="USD" readonly />
      <NumberField className="convert-pannel__input" value={btcCount} onChange={onChangeBtcCount} unit="BTC"
                   leftAction={BtcLeftAction} />
    </div>
  );
};

export default memo(ConvertPannel);
