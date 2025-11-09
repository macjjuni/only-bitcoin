import { memo, useCallback, useMemo } from "react";
import { KButton, KDropdown, KIcon } from "kku-ui";
import { OptionIcon } from "@/components/icon";
import useStore from "@/shared/stores/store";
import "./PremiumField.scss";


const commonButtonProps = { variant: 'subtle', width: 40, size: 'small' } as const;
const OptionButtons = [
  { label: '-1.0', value: -1 },
  { label: '-0.1', value: -0.1 },
  { label: '+0.1', value: 0.1 },
  { label: '+1.0', value: 1 },
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
  const ResetButton = useMemo(() => (isPremium ? <KIcon icon="refresh" size={26} onClick={onClickReset} /> : null), [isPremium]);
  // endregion


  return (
    <div className="premium__field">
      {premium !== 0 && ResetButton}
      <KDropdown position="left" trigger="click">
        <KDropdown.Trigger style={{ cursor: 'pointer' }}>
          <OptionIcon size={30} />
        </KDropdown.Trigger>
        <KDropdown.Content offset={{ x: -3, y: 19 }} autoClose={false}>
          <div className="premium__field__popover">
            <h2 className="premium__field__popover__title">프리미엄:
              {premium}%
            </h2>
            <div className="premium__field__popover__bottom">
              <div className="premium__field__popover__bottom__buttons">
                {
                  OptionButtons.map(({label, value}) => (
                    <KButton {...commonButtonProps} key={label} label={label}
                             onClick={() => { onClickOptionButton(value) }} />
                  ))
                }
              </div>
            </div>
          </div>
        </KDropdown.Content>
      </KDropdown>
    </div>
  );
};

export default memo(PremiumField);