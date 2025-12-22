import { memo, useCallback, useMemo, useRef } from "react";
import { KButton, KButtonGroup, KIcon, KPopover, KPopoverContent, KPopoverTrigger } from "kku-ui";
import { OptionIcon } from "@/components/ui/icon";
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
      <div className="premium__field">
        {premium !== 0 && ResetButton}
        <KPopover>
          <KPopoverTrigger asChild>
            <KButton size="icon">
              <OptionIcon size={60}/>
            </KButton>
          </KPopoverTrigger>
          <KPopoverContent align="start" side="left" sideOffset={5} alignOffset={-5}
                           className="premium__field__popover">
            <h2 className="premium__field__popover__title">
              <div className="premium__field__popover__title__left">
                프리미엄:<span>{premium}%</span>
              </div>

              {ResetButton}
            </h2>
            <KButtonGroup className="premium__field__popover__bottom">
              {
                OptionButtons.map(({label, value}) => (
                    <KButton size="sm" key={label} onClick={() => {
                      onClickOptionButton(value)
                    }}>
                      {label}
                    </KButton>
                ))
              }
            </KButtonGroup>
          </KPopoverContent>
        </KPopover>
      </div>
  );
};

export default memo(PremiumField);