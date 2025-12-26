import { ChangeEvent, forwardRef, memo, ReactNode, Ref, useCallback, useMemo, useRef } from "react";
import { KInputGroup, KInputGroupAddon, KInputGroupInput } from "kku-ui";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import { isNumber } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";


export interface TextFieldTypes extends ComponentBaseTypes {
  value: string;
  onChange: (value: string) => void;
  unit: ReactNode;
  readonly?: boolean;
  leftAction?: ReactNode | string;
  maxLength?: number;
  // eslint-disable-next-line react/no-unused-prop-types
  dataCopy?: string;
  onClick?: () => void;
  isPremium?: boolean;
}


const NumberField = forwardRef((props: TextFieldTypes, ref: Ref<HTMLInputElement>) => {

  // region [Hooks]

  const {
    value, onChange, unit, readonly = false, leftAction, maxLength, onClick, isPremium
  } = props;
  const isFocus = useRef(false);

  // endregion


  // region [Styles]
  // endregion


  // region [Privates]

  const preventEvent = useCallback((e: UIEvent) => {
    e.preventDefault();
  }, []);

  const disableScroll = useCallback(() => {
    document.body.addEventListener("touchmove", preventEvent, { passive: false });
  }, []);

  const enableScroll = useCallback(() => {
    document.body.removeEventListener("touchmove", preventEvent);
  }, []);

  // endregion


  // region [Events]

  const onChangeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {

    const text = e.target.value.replace(/,/g, ""); // 콤마 제거

    if (text === "") {
      return onChange("0");
    }
    if (!isNumber(text)) {
      return;
    }

    // `12.` 같은 경우 숫자로 변환하면 `12`가 되어버리므로 그대로 유지해야 함
    const numberWithComma = text.includes(".") ? text : comma(parseFloat(text).toString());

    onChange(numberWithComma);
  }, [onChange]);

  const onClickInput = useCallback(() => {

    if (readonly) {
      onClick?.();
    }
    if (!isFocus.current) {
      isFocus.current = true;

      if (typeof ref === "function") {
        return;
      }

      const inputRef = ref?.current;
      if (inputRef) {
        inputRef.setSelectionRange(inputRef.value.length, inputRef.value.length);
      }
    }
  }, [onClick, readonly, ref]);

  const onFocus = useCallback(() => {
    disableScroll();
  }, []);

  const onBlur = useCallback(() => {
    isFocus.current = false;
    enableScroll();
  }, []);

  // endregion


  // region [Templates]

  const LeftAction = useMemo(() => (
    leftAction ? <div className="number-field__left-action">{leftAction}</div> : null
  ), [leftAction]);

  // endregion


  return (
    <KInputGroup size="lg" className={`h-12${readonly ? " border-none" : ""} my-1 bg-transparent`}>
      <KInputGroupAddon align="inline-start">{LeftAction}</KInputGroupAddon>
      <KInputGroupInput ref={ref} type="text" maxLength={maxLength} value={value}
                        onChange={onChangeInput} className={`font-number ${readonly ? "text-3xl pr-1" : "text-xl"}
                         font-bold text-right h-full${isPremium && ' text-bitcoin'}`}
                        readOnly={readonly} onFocus={onFocus} onBlur={onBlur} onClick={onClickInput} />
      <KInputGroupAddon align="inline-end"
                        className={`flex justify-end text-lg font-bold text-current pl-1 w-[68px] h-full 
                                    ${unit === 'Sats' && 'tracking-[-1.5px]'} ${readonly && ' pt-4'}`}>
        {unit}
      </KInputGroupAddon>
    </KInputGroup>
  );
});

const MemoizedNumberField = memo(NumberField);
NumberField.displayName = "NumberField";
MemoizedNumberField.displayName = "NumberField";

export default MemoizedNumberField;
