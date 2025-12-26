import { memo } from "react";
import { KNumberStepper } from "kku-ui";
import useStore from "@/shared/stores/store";


const PremiumField = () => {

  // region [Hooks]
  const premium = useStore(state => state.premium);
  const setPremium = useStore(state => state.setPremium);
  // endregion

  // region [Events]
  // const onClickReset = useCallback(() => {
  //   setPremium(0);
  // }, [])
  // endregion

  // region [Templates]
  // const ResetButton = useMemo(() => (isPremium ?
  //     <KIcon icon="refresh" size={26} onClick={onClickReset}/> : null), [isPremium]);
  // endregion

  return (
    <div className="flex justify-end items-center gap-5">
      <div className="flex flex-col items-end gap-0.5">
        <b className="text-base">Premium</b>
        <span className="text-sm opacity-80">P(%):</span>
      </div>
      <KNumberStepper value={premium} onChange={setPremium} min={0} step={0.5} max={100} size="lg" />
    </div>
  );
};

const MemoizedPremiumField = memo(PremiumField)
MemoizedPremiumField.displayName = 'PremiumField';

export default MemoizedPremiumField;