import { memo, useCallback, useMemo, useState } from "react";
import "./ConvertPannel.scss";
import { NumberField } from "@/widgets";

const ConvertPannel = () => {

  // region [Hooks]

  const [krw, setKrw] = useState("0");
  const [usd, setUsd] = useState("0");
  const [btcCount, setBtcCount] = useState("1");

  // endregion


  // region [Events]

  const onChangeUsd = useCallback((value: string) => {
    setUsd(value);
  }, []);

  const onChangeKrw = useCallback((value: string) => {
    setKrw(value);
  }, []);

  const onChangeBtcCount = useCallback((value: string) => {
    setBtcCount(value);
  }, []);

  // endregion


  // region [Life Cycles]
  // endregion


  return (
    <div className="convert-pannel">
      <NumberField className="convert-pannel__input" value={btcCount} onChange={onChangeBtcCount} unit="BTC" readonly />
      <NumberField className="convert-pannel__input" value={usd} onChange={onChangeUsd} unit="USD" readonly />
      <NumberField className="convert-pannel__input" value={krw} onChange={onChangeKrw} unit="KRW" />
    </div>
  );
};

export default memo(ConvertPannel);
