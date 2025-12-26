import { memo, useCallback, useMemo } from "react";
import { KIcon, KNumberStepper } from "kku-ui";
import useStore from "@/shared/stores/store";
import "./PremiumField.scss";


const OptionButtons = [
  {label: '-1', value: -1},
  {label: '-0.1', value: -0.1},
  {label: '+0.1', value: 0.1},
  {label: '+1', value: 1},
] as const;


const PremiumField = () => {

  // region [Hooks]
  const premium = useStore(state => state.premium);
  const setPremium = useStore(state => state.setPremium);
  const isPremium = useMemo(() => (premium !== 0), [premium]);
  // endregion

  // region [Events]
  const onClickOptionButton = useCallback((value: number) => {
    setPremium(parseFloat((premium + value).toFixed(10)));
  }, [premium]);

  const onClickReset = useCallback(() => {
    setPremium(0);
  }, [])
  // endregion

  // region [Templates]
  const ResetButton = useMemo(() => (isPremium ?
      <KIcon icon="refresh" size={26} onClick={onClickReset}/> : null), [isPremium]);
  // endregion


  return (
      <div className="flex justify-between items-center">
        프리미엄
        <KNumberStepper value={premium} onChange={setPremium} min={0} step={0.5} max={100} size="lg" />
      </div>
  );
};

export default memo(PremiumField);